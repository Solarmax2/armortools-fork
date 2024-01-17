
class RenderPathBase {

	static taaFrame = 0;
	static path: RenderPath;
	static superSample = 1.0;
	static lastX = -1.0;
	static lastY = -1.0;
	static bloomMipmaps: RenderTarget[];
	static bloomCurrentMip = 0;
	static bloomSampleScale: f32;
	///if arm_voxels
	static voxelsRes = 256;
	static voxelsCreated = false;
	///end

	static init = (_path: RenderPath) => {
		RenderPathBase.path = _path;
		RenderPathBase.superSample = Config.raw.rp_supersample;
	}

	///if arm_voxels
	static initVoxels = (targetName = "voxels") => {
		if (Config.raw.rp_gi != true || RenderPathBase.voxelsCreated) return;
		RenderPathBase.voxelsCreated = true;

		{
			let t = new RenderTargetRaw();
			t.name = targetName;
			t.format = "R8";
			t.width = RenderPathBase.voxelsRes;
			t.height = RenderPathBase.voxelsRes;
			t.depth = RenderPathBase.voxelsRes;
			t.is_image = true;
			t.mipmaps = true;
			RenderPathBase.path.createRenderTarget(t);
		}
	}
	///end

	static applyConfig = () => {
		if (RenderPathBase.superSample != Config.raw.rp_supersample) {
			RenderPathBase.superSample = Config.raw.rp_supersample;
			for (let rt of RenderPathBase.path.renderTargets.values()) {
				if (rt.raw.width == 0 && rt.raw.scale != null) {
					rt.raw.scale = RenderPathBase.superSample;
				}
			}
			RenderPathBase.path.resize();
		}
		///if arm_voxels
		if (!RenderPathBase.voxelsCreated) RenderPathBase.initVoxels();
		///end
	}

	static getSuperSampling = (): f32 => {
		return RenderPathBase.superSample;
	}

	static drawCompass = (currentG: Graphics4) => {
		if (Context.raw.showCompass) {
			let scene = Scene.active;
			let cam = scene.camera;
			let compass: MeshObject = scene.getChild(".Compass") as MeshObject;

			let _visible = compass.visible;
			let _parent = compass.parent;
			let _loc = compass.transform.loc;
			let _rot = compass.transform.rot;
			let crot = cam.transform.rot;
			let ratio = App.w() / App.h();
			let _P = cam.P;
			cam.P = Mat4.ortho(-8 * ratio, 8 * ratio, -8, 8, -2, 2);
			compass.visible = true;
			compass.parent = cam;
			compass.transform.loc = new Vec4(7.4 * ratio, 7.0, -1);
			compass.transform.rot = new Quat(-crot.x, -crot.y, -crot.z, crot.w);
			compass.transform.scale.set(0.4, 0.4, 0.4);
			compass.transform.buildMatrix();
			compass.frustumCulling = false;
			compass.render(currentG, "overlay", []);

			cam.P = _P;
			compass.visible = _visible;
			compass.parent = _parent;
			compass.transform.loc = _loc;
			compass.transform.rot = _rot;
			compass.transform.buildMatrix();
		}
	}

	static begin = () => {
		// Begin split
		if (Context.raw.splitView && !Context.raw.paint2dView) {
			if (Context.raw.viewIndexLast == -1 && Context.raw.viewIndex == -1) {
				// Begin split, draw right viewport first
				Context.raw.viewIndex = 1;
			}
			else {
				// Set current viewport
				Context.raw.viewIndex = Input.getMouse().viewX > Base.w() / 2 ? 1 : 0;
			}

			let cam = Scene.active.camera;
			if (Context.raw.viewIndexLast > -1) {
				// Save current viewport camera
				Camera.inst.views[Context.raw.viewIndexLast].setFrom(cam.transform.local);
			}

			let decal = Context.raw.tool == WorkspaceTool.ToolDecal || Context.raw.tool == WorkspaceTool.ToolText;

			if (Context.raw.viewIndexLast != Context.raw.viewIndex || decal || !Config.raw.brush_3d) {
				// Redraw on current viewport change
				Context.raw.ddirty = 1;
			}

			cam.transform.setMatrix(Camera.inst.views[Context.raw.viewIndex]);
			cam.buildMatrix();
			cam.buildProjection();
		}

		// Match projection matrix jitter
		let skipTaa = Context.raw.splitView || ((Context.raw.tool == WorkspaceTool.ToolClone || Context.raw.tool == WorkspaceTool.ToolBlur || Context.raw.tool == WorkspaceTool.ToolSmudge) && Context.raw.pdirty > 0);
		Scene.active.camera.frame = skipTaa ? 0 : RenderPathBase.taaFrame;
		Scene.active.camera.projectionJitter();
		Scene.active.camera.buildMatrix();
	}

	static end = () => {
		// End split
		Context.raw.viewIndexLast = Context.raw.viewIndex;
		Context.raw.viewIndex = -1;

		if (Context.raw.foregroundEvent && !Input.getMouse().down()) {
			Context.raw.foregroundEvent = false;
			Context.raw.pdirty = 0;
		}

		RenderPathBase.taaFrame++;
	}

	static ssaa4 = (): bool => {
		return Config.raw.rp_supersample == 4;
	}

	static isCached = (): bool => {
		if (System.width == 0 || System.height == 0) return true;

		let mouse = Input.getMouse();
		let mx = RenderPathBase.lastX;
		let my = RenderPathBase.lastY;
		RenderPathBase.lastX = mouse.viewX;
		RenderPathBase.lastY = mouse.viewY;

		if (Context.raw.ddirty <= 0 && Context.raw.rdirty <= 0 && Context.raw.pdirty <= 0) {
			if (mx != RenderPathBase.lastX || my != RenderPathBase.lastY || mouse.locked) Context.raw.ddirty = 0;
			///if (krom_metal || krom_android)
			if (Context.raw.ddirty > -6) {
			///else
			if (Context.raw.ddirty > -2) {
			///end
				RenderPathBase.path.setTarget("");
				RenderPathBase.path.bindTarget("taa", "tex");
				RenderPathBase.ssaa4() ?
					RenderPathBase.path.drawShader("shader_datas/supersample_resolve/supersample_resolve") :
					RenderPathBase.path.drawShader("shader_datas/copy_pass/copy_pass");
				RenderPathPaint.commandsCursor();
				if (Context.raw.ddirty <= 0) Context.raw.ddirty--;
			}
			RenderPathBase.end();
			return true;
		}
		return false;
	}

	static commands = (drawCommands: ()=>void) => {
		if (RenderPathBase.isCached()) return;
		RenderPathBase.begin();

		RenderPathPaint.begin();
		RenderPathBase.drawSplit(drawCommands);
		RenderPathBase.drawGbuffer();
		RenderPathPaint.draw();

		///if (krom_direct3d12 || krom_vulkan || krom_metal)
		if (Context.raw.viewportMode ==  ViewportMode.ViewPathTrace) {
			///if is_paint
			let useLiveLayer = Context.raw.tool == WorkspaceTool.ToolMaterial;
			///else
			let useLiveLayer = false;
			///end
			RenderPathRaytrace.draw(useLiveLayer);
			return;
		}
		///end

		drawCommands();
		RenderPathPaint.end();
		RenderPathBase.end();
	}

	static drawBloom = (tex = "tex") => {
		if (Config.raw.rp_bloom != false) {
			if (RenderPathBase.bloomMipmaps == null) {
				RenderPathBase.bloomMipmaps = [];

				let prevScale = 1.0;
				for (let i = 0; i < 10; ++i) {
					let t = new RenderTargetRaw();
					t.name = "bloom_mip_" + i;
					t.width = 0;
					t.height = 0;
					t.scale = (prevScale *= 0.5);
					t.format = "RGBA64";
					RenderPathBase.bloomMipmaps.push(RenderPathBase.path.createRenderTarget(t));
				}

				RenderPathBase.path.loadShader("shader_datas/bloom_pass/bloom_downsample_pass");
				RenderPathBase.path.loadShader("shader_datas/bloom_pass/bloom_upsample_pass");

				Uniforms.externalIntLinks.push((_: any, __: any, link: string) => {
					if (link == "_bloomCurrentMip") return RenderPathBase.bloomCurrentMip;
					return null;
				});
				Uniforms.externalFloatLinks.push((_: any, __: any, link: string) => {
					if (link == "_bloomSampleScale") return RenderPathBase.bloomSampleScale;
					return null;
				});
			}

			let bloomRadius = 6.5;
			let minDim = Math.min(RenderPathBase.path.currentW, RenderPathBase.path.currentH);
			let logMinDim = Math.max(1.0, Math.log2(minDim) + (bloomRadius - 8.0));
			let numMips = Math.floor(logMinDim);
			RenderPathBase.bloomSampleScale = 0.5 + logMinDim - numMips;

			for (let i = 0; i < numMips; ++i) {
				RenderPathBase.bloomCurrentMip = i;
				RenderPathBase.path.setTarget(RenderPathBase.bloomMipmaps[i].raw.name);
				RenderPathBase.path.clearTarget();
				RenderPathBase.path.bindTarget(i == 0 ? tex : RenderPathBase.bloomMipmaps[i - 1].raw.name, "tex");
				RenderPathBase.path.drawShader("shader_datas/bloom_pass/bloom_downsample_pass");
			}
			for (let i = 0; i < numMips; ++i) {
				let mipLevel = numMips - 1 - i;
				RenderPathBase.bloomCurrentMip = mipLevel;
				RenderPathBase.path.setTarget(mipLevel == 0 ? tex : RenderPathBase.bloomMipmaps[mipLevel - 1].raw.name);
				RenderPathBase.path.bindTarget(RenderPathBase.bloomMipmaps[mipLevel].raw.name, "tex");
				RenderPathBase.path.drawShader("shader_datas/bloom_pass/bloom_upsample_pass");
			}
		}
	}

	static drawSplit = (drawCommands: ()=>void) => {
		if (Context.raw.splitView && !Context.raw.paint2dView) {
			Context.raw.ddirty = 2;
			let cam = Scene.active.camera;

			Context.raw.viewIndex = Context.raw.viewIndex == 0 ? 1 : 0;
			cam.transform.setMatrix(Camera.inst.views[Context.raw.viewIndex]);
			cam.buildMatrix();
			cam.buildProjection();

			RenderPathBase.drawGbuffer();

			///if (krom_direct3d12 || krom_vulkan || krom_metal)
			///if is_paint
			let useLiveLayer = Context.raw.tool == WorkspaceTool.ToolMaterial;
			///else
			let useLiveLayer = false;
			///end
			Context.raw.viewportMode == ViewportMode.ViewPathTrace ? RenderPathRaytrace.draw(useLiveLayer) : drawCommands();
			///else
			drawCommands();
			///end

			Context.raw.viewIndex = Context.raw.viewIndex == 0 ? 1 : 0;
			cam.transform.setMatrix(Camera.inst.views[Context.raw.viewIndex]);
			cam.buildMatrix();
			cam.buildProjection();
		}
	}

	///if arm_voxels
	static drawVoxels = () => {
		if (Config.raw.rp_gi != false) {
			let voxelize = Context.raw.ddirty > 0 && RenderPathBase.taaFrame > 0;
			if (voxelize) {
				RenderPathBase.path.clearImage("voxels", 0x00000000);
				RenderPathBase.path.setTarget("");
				RenderPathBase.path.setViewport(RenderPathBase.voxelsRes, RenderPathBase.voxelsRes);
				RenderPathBase.path.bindTarget("voxels", "voxels");
				if (MakeMaterial.heightUsed) {
					let tid = 0; // Project.layers[0].id;
					RenderPathBase.path.bindTarget("texpaint_pack" + tid, "texpaint_pack");
				}
				RenderPathBase.path.drawMeshes("voxel");
				RenderPathBase.path.generateMipmaps("voxels");
			}
		}
	}
	///end

	static initSSAO = () => {
		{
			let t = new RenderTargetRaw();
			t.name = "singlea";
			t.width = 0;
			t.height = 0;
			t.format = "R8";
			t.scale = RenderPathBase.getSuperSampling();
			RenderPathBase.path.createRenderTarget(t);
		}
		{
			let t = new RenderTargetRaw();
			t.name = "singleb";
			t.width = 0;
			t.height = 0;
			t.format = "R8";
			t.scale = RenderPathBase.getSuperSampling();
			RenderPathBase.path.createRenderTarget(t);
		}
		RenderPathBase.path.loadShader("shader_datas/ssao_pass/ssao_pass");
		RenderPathBase.path.loadShader("shader_datas/ssao_blur_pass/ssao_blur_pass_x");
		RenderPathBase.path.loadShader("shader_datas/ssao_blur_pass/ssao_blur_pass_y");
	}

	static drawSSAO = () => {
		let ssao = Config.raw.rp_ssao != false && Context.raw.cameraType == CameraType.CameraPerspective;
		if (ssao && Context.raw.ddirty > 0 && RenderPathBase.taaFrame > 0) {
			if (RenderPathBase.path.renderTargets.get("singlea") == null) {
				RenderPathBase.initSSAO();
			}

			RenderPathBase.path.setTarget("singlea");
			RenderPathBase.path.bindTarget("_main", "gbufferD");
			RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
			RenderPathBase.path.drawShader("shader_datas/ssao_pass/ssao_pass");

			RenderPathBase.path.setTarget("singleb");
			RenderPathBase.path.bindTarget("singlea", "tex");
			RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
			RenderPathBase.path.drawShader("shader_datas/ssao_blur_pass/ssao_blur_pass_x");

			RenderPathBase.path.setTarget("singlea");
			RenderPathBase.path.bindTarget("singleb", "tex");
			RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
			RenderPathBase.path.drawShader("shader_datas/ssao_blur_pass/ssao_blur_pass_y");
		}
	}

	static drawDeferredLight = () => {
		RenderPathBase.path.setTarget("tex");
		RenderPathBase.path.bindTarget("_main", "gbufferD");
		RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
		RenderPathBase.path.bindTarget("gbuffer1", "gbuffer1");
		let ssao = Config.raw.rp_ssao != false && Context.raw.cameraType == CameraType.CameraPerspective;
		if (ssao && RenderPathBase.taaFrame > 0) {
			RenderPathBase.path.bindTarget("singlea", "ssaotex");
		}
		else {
			RenderPathBase.path.bindTarget("empty_white", "ssaotex");
		}

		let voxelao_pass = false;
		///if arm_voxels
		if (Config.raw.rp_gi != false) {
			voxelao_pass = true;
			RenderPathBase.path.bindTarget("voxels", "voxels");
		}
		///end

		voxelao_pass ?
			RenderPathBase.path.drawShader("shader_datas/deferred_light/deferred_light_voxel") :
			RenderPathBase.path.drawShader("shader_datas/deferred_light/deferred_light");

		///if (krom_direct3d11 || krom_direct3d12 || krom_metal || krom_vulkan)
		RenderPathBase.path.setDepthFrom("tex", "gbuffer0"); // Bind depth for world pass
		///end

		RenderPathBase.path.setTarget("tex");
		RenderPathBase.path.drawSkydome("shader_datas/world_pass/world_pass");

		///if (krom_direct3d11 || krom_direct3d12 || krom_metal || krom_vulkan)
		RenderPathBase.path.setDepthFrom("tex", "gbuffer1"); // Unbind depth
		///end
	}

	static drawSSR = () => {
		if (Config.raw.rp_ssr != false) {
			if (RenderPathBase.path.cachedShaderContexts.get("shader_datas/ssr_pass/ssr_pass") == null) {
				{
					let t = new RenderTargetRaw();
					t.name = "bufb";
					t.width = 0;
					t.height = 0;
					t.format = "RGBA64";
					RenderPathBase.path.createRenderTarget(t);
				}
				RenderPathBase.path.loadShader("shader_datas/ssr_pass/ssr_pass");
				RenderPathBase.path.loadShader("shader_datas/ssr_blur_pass/ssr_blur_pass_x");
				RenderPathBase.path.loadShader("shader_datas/ssr_blur_pass/ssr_blur_pass_y3_blend");
			}
			let targeta = "bufb";
			let targetb = "gbuffer1";

			RenderPathBase.path.setTarget(targeta);
			RenderPathBase.path.bindTarget("tex", "tex");
			RenderPathBase.path.bindTarget("_main", "gbufferD");
			RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
			RenderPathBase.path.bindTarget("gbuffer1", "gbuffer1");
			RenderPathBase.path.drawShader("shader_datas/ssr_pass/ssr_pass");

			RenderPathBase.path.setTarget(targetb);
			RenderPathBase.path.bindTarget(targeta, "tex");
			RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
			RenderPathBase.path.drawShader("shader_datas/ssr_blur_pass/ssr_blur_pass_x");

			RenderPathBase.path.setTarget("tex");
			RenderPathBase.path.bindTarget(targetb, "tex");
			RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
			RenderPathBase.path.drawShader("shader_datas/ssr_blur_pass/ssr_blur_pass_y3_blend");
		}
	}

	// static drawMotionBlur = () => {
	// 	if (Config.raw.rp_motionblur != false) {
	// 		RenderPathBase.path.setTarget("buf");
	// 		RenderPathBase.path.bindTarget("tex", "tex");
	// 		RenderPathBase.path.bindTarget("gbuffer0", "gbuffer0");
	// 		///if (rp_motionblur == "Camera")
	// 		{
	// 			RenderPathBase.path.bindTarget("_main", "gbufferD");
	// 			RenderPathBase.path.drawShader("shader_datas/motion_blur_pass/motion_blur_pass");
	// 		}
	// 		///else
	// 		{
	// 			RenderPathBase.path.bindTarget("gbuffer2", "sveloc");
	// 			RenderPathBase.path.drawShader("shader_datas/motion_blur_veloc_pass/motion_blur_veloc_pass");
	// 		}
	// 		///end
	// 		RenderPathBase.path.setTarget("tex");
	// 		RenderPathBase.path.bindTarget("buf", "tex");
	// 		RenderPathBase.path.drawShader("shader_datas/copy_pass/copy_pass");
	// 	}
	// }

	// static drawHistogram = () => {
	// 	{
	// 		let t = new RenderTargetRaw();
	// 		t.name = "histogram";
	// 		t.width = 1;
	// 		t.height = 1;
	// 		t.format = "RGBA64";
	// 		RenderPathBase.path.createRenderTarget(t);

	// 		RenderPathBase.path.loadShader("shader_datas/histogram_pass/histogram_pass");
	// 	}

	// 	RenderPathBase.path.setTarget("histogram");
	// 	RenderPathBase.path.bindTarget("taa", "tex");
	// 	RenderPathBase.path.drawShader("shader_datas/histogram_pass/histogram_pass");
	// }

	static drawTAA = () => {
		let current = RenderPathBase.taaFrame % 2 == 0 ? "buf2" : "taa2";
		let last = RenderPathBase.taaFrame % 2 == 0 ? "taa2" : "buf2";

		RenderPathBase.path.setTarget(current);
		RenderPathBase.path.clearTarget(0x00000000);
		RenderPathBase.path.bindTarget("buf", "colorTex");
		RenderPathBase.path.drawShader("shader_datas/smaa_edge_detect/smaa_edge_detect");

		RenderPathBase.path.setTarget("taa");
		RenderPathBase.path.clearTarget(0x00000000);
		RenderPathBase.path.bindTarget(current, "edgesTex");
		RenderPathBase.path.drawShader("shader_datas/smaa_blend_weight/smaa_blend_weight");

		RenderPathBase.path.setTarget(current);
		RenderPathBase.path.bindTarget("buf", "colorTex");
		RenderPathBase.path.bindTarget("taa", "blendTex");
		RenderPathBase.path.bindTarget("gbuffer2", "sveloc");
		RenderPathBase.path.drawShader("shader_datas/smaa_neighborhood_blend/smaa_neighborhood_blend");

		let skipTaa = Context.raw.splitView;
		if (skipTaa) {
			RenderPathBase.path.setTarget("taa");
			RenderPathBase.path.bindTarget(current, "tex");
			RenderPathBase.path.drawShader("shader_datas/copy_pass/copy_pass");
		}
		else {
			RenderPathBase.path.setTarget("taa");
			RenderPathBase.path.bindTarget(current, "tex");
			RenderPathBase.path.bindTarget(last, "tex2");
			RenderPathBase.path.bindTarget("gbuffer2", "sveloc");
			RenderPathBase.path.drawShader("shader_datas/taa_pass/taa_pass");
		}

		if (RenderPathBase.ssaa4()) {
			RenderPathBase.path.setTarget("");
			RenderPathBase.path.bindTarget(RenderPathBase.taaFrame % 2 == 0 ? "taa2" : "taa", "tex");
			RenderPathBase.path.drawShader("shader_datas/supersample_resolve/supersample_resolve");
		}
		else {
			RenderPathBase.path.setTarget("");
			RenderPathBase.path.bindTarget(RenderPathBase.taaFrame == 0 ? current : "taa", "tex");
			RenderPathBase.path.drawShader("shader_datas/copy_pass/copy_pass");
		}
	}

	static drawGbuffer = () => {
		RenderPathBase.path.setTarget("gbuffer0"); // Only clear gbuffer0
		///if krom_metal
		RenderPathBase.path.clearTarget(0x00000000, 1.0);
		///else
		RenderPathBase.path.clearTarget(null, 1.0);
		///end
		if (MakeMesh.layerPassCount == 1) {
			RenderPathBase.path.setTarget("gbuffer2");
			RenderPathBase.path.clearTarget(0xff000000);
		}
		RenderPathBase.path.setTarget("gbuffer0", ["gbuffer1", "gbuffer2"]);
		let currentG = RenderPathBase.path.currentG;
		RenderPathPaint.bindLayers();
		RenderPathBase.path.drawMeshes("mesh");
		RenderPathPaint.unbindLayers();
		if (MakeMesh.layerPassCount > 1) {
			RenderPathBase.makeGbufferCopyTextures();
			for (let i = 1; i < MakeMesh.layerPassCount; ++i) {
				let ping = i % 2 == 1 ? "_copy" : "";
				let pong = i % 2 == 1 ? "" : "_copy";
				if (i == MakeMesh.layerPassCount - 1) {
					RenderPathBase.path.setTarget("gbuffer2" + ping);
					RenderPathBase.path.clearTarget(0xff000000);
				}
				RenderPathBase.path.setTarget("gbuffer0" + ping, ["gbuffer1" + ping, "gbuffer2" + ping]);
				RenderPathBase.path.bindTarget("gbuffer0" + pong, "gbuffer0");
				RenderPathBase.path.bindTarget("gbuffer1" + pong, "gbuffer1");
				RenderPathBase.path.bindTarget("gbuffer2" + pong, "gbuffer2");
				RenderPathPaint.bindLayers();
				RenderPathBase.path.drawMeshes("mesh" + i);
				RenderPathPaint.unbindLayers();
			}
			if (MakeMesh.layerPassCount % 2 == 0) {
				RenderPathBase.copyToGbuffer();
			}
		}

		let hide = Operator.shortcut(Config.keymap.stencil_hide, ShortcutType.ShortcutDown) || Input.getKeyboard().down("control");
		let isDecal = Base.isDecalLayer();
		if (isDecal && !hide) LineDraw.render(currentG, Context.raw.layer.decalMat);
	}

	static makeGbufferCopyTextures = () => {
		let copy = RenderPathBase.path.renderTargets.get("gbuffer0_copy");
		if (copy == null || copy.image.width != RenderPathBase.path.renderTargets.get("gbuffer0").image.width || copy.image.height != RenderPathBase.path.renderTargets.get("gbuffer0").image.height) {
			{
				let t = new RenderTargetRaw();
				t.name = "gbuffer0_copy";
				t.width = 0;
				t.height = 0;
				t.format = "RGBA64";
				t.scale = RenderPathBase.getSuperSampling();
				t.depth_buffer = "main";
				RenderPathBase.path.createRenderTarget(t);
			}
			{
				let t = new RenderTargetRaw();
				t.name = "gbuffer1_copy";
				t.width = 0;
				t.height = 0;
				t.format = "RGBA64";
				t.scale = RenderPathBase.getSuperSampling();
				RenderPathBase.path.createRenderTarget(t);
			}
			{
				let t = new RenderTargetRaw();
				t.name = "gbuffer2_copy";
				t.width = 0;
				t.height = 0;
				t.format = "RGBA64";
				t.scale = RenderPathBase.getSuperSampling();
				RenderPathBase.path.createRenderTarget(t);
			}

			///if krom_metal
			// TODO: Fix depth attach for gbuffer0_copy on metal
			// Use resize to re-create buffers from scratch for now
			RenderPathBase.path.resize();
			///end
		}
	}

	static copyToGbuffer = () => {
		RenderPathBase.path.setTarget("gbuffer0", ["gbuffer1", "gbuffer2"]);
		RenderPathBase.path.bindTarget("gbuffer0_copy", "tex0");
		RenderPathBase.path.bindTarget("gbuffer1_copy", "tex1");
		RenderPathBase.path.bindTarget("gbuffer2_copy", "tex2");
		RenderPathBase.path.drawShader("shader_datas/copy_mrt3_pass/copy_mrt3RGBA64_pass");
	}
}
