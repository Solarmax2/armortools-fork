
class UIBase {

	static inst: UIBase;
	show = true;
	ui: Zui;
	borderStarted = 0;
	borderHandle_ptr: i32 = 0;
	action_paint_remap = "";
	operatorSearchOffset = 0;
	undoTapTime = 0.0;
	redoTapTime = 0.0;

	static init_hwnds = (): Handle[] => {
		///if is_paint
		return [new Handle(), new Handle(), new Handle()];
		///end
		///if is_sculpt
		return [new Handle(), new Handle(), new Handle()];
		///end
		///if is_lab
		return [new Handle()];
		///end
	}

	static init_htabs = (): Handle[] => {
		///if is_paint
		return [new Handle(), new Handle(), new Handle()];
		///end
		///if is_sculpt
		return [new Handle(), new Handle(), new Handle()];
		///end
		///if is_lab
		return [new Handle()];
		///end
	}

	static init_hwnd_tabs = (): any[] => {
		///if is_paint
		return [
			[TabLayers.draw, TabHistory.draw, TabPlugins.draw
				///if is_forge
				, TabObjects.draw
				///end
			],
			[TabMaterials.draw, TabBrushes.draw, TabParticles.draw],
			[TabBrowser.draw, TabTextures.draw, TabMeshes.draw, TabFonts.draw, TabSwatches.draw, TabScript.draw, TabConsole.draw, UIStatus.drawVersionTab]
		];
		///end
		///if is_sculpt
		return [
			[TabLayers.draw, TabHistory.draw, TabPlugins.draw
				///if is_forge
				, TabObjects.draw
				///end
			],
			[TabMaterials.draw, TabBrushes.draw, TabParticles.draw],
			[TabBrowser.draw, TabTextures.draw, TabMeshes.draw, TabFonts.draw, TabScript.draw, TabConsole.draw, UIStatus.drawVersionTab]
		];
		///end
		///if is_lab
		return [
			[TabBrowser.draw, TabTextures.draw, TabMeshes.draw, TabSwatches.draw, TabPlugins.draw, TabScript.draw, TabConsole.draw, UIStatus.drawVersionTab]
		];
		///end
	}

	hwnds = UIBase.init_hwnds();
	htabs = UIBase.init_htabs();
	hwndTabs = UIBase.init_hwnd_tabs();

	///if (is_paint || is_sculpt)
	static defaultSidebarMiniW = 56;
	static defaultSidebarFullW = 280;
	///if (krom_android || krom_ios)
	static defaultSidebarW = UIBase.defaultSidebarMiniW;
	///else
	static defaultSidebarW = UIBase.defaultSidebarFullW;
	///end
	tabx = 0;
	hminimized = new Handle();
	static sidebarMiniW = UIBase.defaultSidebarMiniW;
	///end

	constructor() {
		UIBase.inst = this;

		///if (is_paint || is_sculpt)
		new UIToolbar();
		UIToolbar.inst.toolbarw = Math.floor(UIToolbar.defaultToolbarW * Config.raw.window_scale);
		Context.raw.textToolText = tr("Text");
		///end

		new UIHeader();
		new UIStatus();
		new UIMenubar();

		UIHeader.headerh = Math.floor(UIHeader.defaultHeaderH * Config.raw.window_scale);
		UIMenubar.inst.menubarw = Math.floor(UIMenubar.defaultMenubarW * Config.raw.window_scale);

		///if (is_paint || is_sculpt)
		if (Project.materials == null) {
			Project.materials = [];
			Data.getMaterial("Scene", "Material", (m: MaterialData) => {
				Project.materials.push(new SlotMaterial(m));
				Context.raw.material = Project.materials[0];
			});
		}

		if (Project.brushes == null) {
			Project.brushes = [];
			Project.brushes.push(new SlotBrush());
			Context.raw.brush = Project.brushes[0];
			MakeMaterial.parseBrush();
		}

		if (Project.fonts == null) {
			Project.fonts = [];
			Project.fonts.push(new SlotFont("default.ttf", Base.font));
			Context.raw.font = Project.fonts[0];
		}

		if (Project.layers == null) {
			Project.layers = [];
			Project.layers.push(new SlotLayer());
			Context.raw.layer = Project.layers[0];
		}
		///end

		///if is_lab
		if (Project.materialData == null) {
			Data.getMaterial("Scene", "Material", (m: MaterialData) => {
				Project.materialData = m;
			});
		}

		if (Project.defaultCanvas == null) { // Synchronous
			Data.getBlob("default_brush.arm", (b: ArrayBuffer) => {
				Project.defaultCanvas = b;
			});
		}

		Project.nodes = new Nodes();
		Project.canvas = ArmPack.decode(Project.defaultCanvas);
		Project.canvas.name = "Brush 1";

		Context.parseBrushInputs();

		ParserLogic.parse(Project.canvas);
		///end

		if (Project.raw.swatches == null) {
			Project.setDefaultSwatches();
			Context.raw.swatch = Project.raw.swatches[0];
		}

		if (Context.raw.emptyEnvmap == null) {
			let b = new Uint8Array(4);
			b[0] = 8;
			b[1] = 8;
			b[2] = 8;
			b[3] = 255;
			Context.raw.emptyEnvmap = Image.fromBytes(b.buffer, 1, 1);
		}
		if (Context.raw.previewEnvmap == null) {
			let b = new Uint8Array(4);
			b[0] = 0;
			b[1] = 0;
			b[2] = 0;
			b[3] = 255;
			Context.raw.previewEnvmap = Image.fromBytes(b.buffer, 1, 1);
		}

		let world = Scene.active.world;
		if (Context.raw.savedEnvmap == null) {
			// Context.raw.savedEnvmap = world.envmap;
			Context.raw.defaultIrradiance = world.probe.irradiance;
			Context.raw.defaultRadiance = world.probe.radiance;
			Context.raw.defaultRadianceMipmaps = world.probe.radianceMipmaps;
		}
		world.envmap = Context.raw.showEnvmap ? Context.raw.savedEnvmap : Context.raw.emptyEnvmap;
		Context.raw.ddirty = 1;

		History.reset();

		let scale = Config.raw.window_scale;
		this.ui = new Zui({ theme: Base.theme, font: Base.font, scaleFactor: scale, color_wheel: Base.colorWheel, black_white_gradient: Base.colorWheelGradient });
		Zui.onBorderHover = this.onBorderHover;
		Zui.onTextHover = this.onTextHover;
		Zui.onDeselectText = this.onDeselectText;
		Zui.onTabDrop = this.onTabDrop;

		///if (is_paint || is_sculpt)
		let resources = ["cursor.k", "icons.k"];
		///end
		///if is_lab
		let resources = ["cursor.k", "icons.k", "placeholder.k"];
		///end

		///if (is_paint || is_sculpt)
		Context.raw.gizmo = Scene.active.getChild(".Gizmo");
		Context.raw.gizmoTranslateX = Context.raw.gizmo.getChild(".TranslateX");
		Context.raw.gizmoTranslateY = Context.raw.gizmo.getChild(".TranslateY");
		Context.raw.gizmoTranslateZ = Context.raw.gizmo.getChild(".TranslateZ");
		Context.raw.gizmoScaleX = Context.raw.gizmo.getChild(".ScaleX");
		Context.raw.gizmoScaleY = Context.raw.gizmo.getChild(".ScaleY");
		Context.raw.gizmoScaleZ = Context.raw.gizmo.getChild(".ScaleZ");
		Context.raw.gizmoRotateX = Context.raw.gizmo.getChild(".RotateX");
		Context.raw.gizmoRotateY = Context.raw.gizmo.getChild(".RotateY");
		Context.raw.gizmoRotateZ = Context.raw.gizmo.getChild(".RotateZ");
		///end

		Res.load(resources, () => {});

		if (this.ui.SCALE() > 1) this.setIconScale();

		Context.raw.paintObject = (Scene.active.getChild(".Cube") as MeshObject);
		Project.paintObjects = [Context.raw.paintObject];

		if (Project.filepath == "") {
			App.notifyOnInit(Base.initLayers);
		}

		Context.raw.projectObjects = [];
		for (let m of Scene.active.meshes) Context.raw.projectObjects.push(m);

		Operator.register("view_top", this.view_top);
	}

	update = () => {
		this.updateUI();
		Operator.update();

		for (let p of Plugin.plugins.values()) if (p.update != null) p.update();

		if (!Base.uiEnabled) return;

		if (!UINodes.inst.ui.isTyping && !this.ui.isTyping) {
			if (Operator.shortcut(Config.keymap.toggle_node_editor)) {
				///if (is_paint || is_sculpt)
				UINodes.inst.canvasType == CanvasType.CanvasMaterial ? this.showMaterialNodes() : this.showBrushNodes();
				///end
				///if is_lab
				this.showMaterialNodes();
				///end
			}
			else if (Operator.shortcut(Config.keymap.toggle_browser)) {
				this.toggleBrowser();
			}

			else if (Operator.shortcut(Config.keymap.toggle_2d_view)) {
				///if (is_paint || is_sculpt)
				this.show2DView(View2DType.View2DLayer);
				///else
				this.show2DView(View2DType.View2DAsset);
				///end
			}
		}

		if (Operator.shortcut(Config.keymap.file_save_as)) Project.projectSaveAs();
		else if (Operator.shortcut(Config.keymap.file_save)) Project.projectSave();
		else if (Operator.shortcut(Config.keymap.file_open)) Project.projectOpen();
		else if (Operator.shortcut(Config.keymap.file_open_recent)) BoxProjects.show();
		else if (Operator.shortcut(Config.keymap.file_reimport_mesh)) Project.reimportMesh();
		else if (Operator.shortcut(Config.keymap.file_reimport_textures)) Project.reimportTextures();
		else if (Operator.shortcut(Config.keymap.file_new)) Project.projectNewBox();
		///if (is_paint || is_lab)
		else if (Operator.shortcut(Config.keymap.file_export_textures)) {
			if (Context.raw.textureExportPath == "") { // First export, ask for path
				///if is_paint
				Context.raw.layersExport = ExportMode.ExportVisible;
				///end
				BoxExport.showTextures();
			}
			else {
				let _init = () => {
					ExportTexture.run(Context.raw.textureExportPath);
				}
				App.notifyOnInit(_init);
			}
		}
		else if (Operator.shortcut(Config.keymap.file_export_textures_as)) {
			///if (is_paint || is_sculpt)
			Context.raw.layersExport = ExportMode.ExportVisible;
			///end
			BoxExport.showTextures();
		}
		///end
		else if (Operator.shortcut(Config.keymap.file_import_assets)) Project.importAsset();
		else if (Operator.shortcut(Config.keymap.edit_prefs)) BoxPreferences.show();

		let kb = Input.getKeyboard();
		if (kb.started(Config.keymap.view_distract_free) ||
		   (kb.started("escape") && !this.show && !UIBox.show)) {
			this.toggleDistractFree();
		}

		///if krom_linux
		if (Operator.shortcut("alt+enter", ShortcutType.ShortcutStarted)) {
			Base.toggleFullscreen();
		}
		///end

		let mouse = Input.getMouse();

		///if (is_paint || is_sculpt)
		let decal = Context.raw.tool == WorkspaceTool.ToolDecal || Context.raw.tool == WorkspaceTool.ToolText;
		let decalMask = decal && Operator.shortcut(Config.keymap.decal_mask, ShortcutType.ShortcutDown);

		if ((Context.raw.brushCanLock || Context.raw.brushLocked) && mouse.moved) {
			if (Operator.shortcut(Config.keymap.brush_radius, ShortcutType.ShortcutDown) ||
				Operator.shortcut(Config.keymap.brush_opacity, ShortcutType.ShortcutDown) ||
				Operator.shortcut(Config.keymap.brush_angle, ShortcutType.ShortcutDown) ||
				(decalMask && Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.brush_radius, ShortcutType.ShortcutDown))) {
				if (Context.raw.brushLocked) {
					if (Operator.shortcut(Config.keymap.brush_opacity, ShortcutType.ShortcutDown)) {
						Context.raw.brushOpacity += mouse.movementX / 500;
						Context.raw.brushOpacity = Math.max(0.0, Math.min(1.0, Context.raw.brushOpacity));
						Context.raw.brushOpacity = Math.round(Context.raw.brushOpacity * 100) / 100;
						Context.raw.brushOpacityHandle.value = Context.raw.brushOpacity;
					}
					else if (Operator.shortcut(Config.keymap.brush_angle, ShortcutType.ShortcutDown)) {
						Context.raw.brushAngle += mouse.movementX / 5;
						Context.raw.brushAngle = Math.floor(Context.raw.brushAngle) % 360;
						if (Context.raw.brushAngle < 0) Context.raw.brushAngle += 360;
						Context.raw.brushAngleHandle.value = Context.raw.brushAngle;
						MakeMaterial.parsePaintMaterial();
					}
					else if (decalMask && Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.brush_radius, ShortcutType.ShortcutDown)) {
						Context.raw.brushDecalMaskRadius += mouse.movementX / 150;
						Context.raw.brushDecalMaskRadius = Math.max(0.01, Math.min(4.0, Context.raw.brushDecalMaskRadius));
						Context.raw.brushDecalMaskRadius = Math.round(Context.raw.brushDecalMaskRadius * 100) / 100;
						Context.raw.brushDecalMaskRadiusHandle.value = Context.raw.brushDecalMaskRadius;
					}
					else {
						Context.raw.brushRadius += mouse.movementX / 150;
						Context.raw.brushRadius = Math.max(0.01, Math.min(4.0, Context.raw.brushRadius));
						Context.raw.brushRadius = Math.round(Context.raw.brushRadius * 100) / 100;
						Context.raw.brushRadiusHandle.value = Context.raw.brushRadius;
					}
					UIHeader.inst.headerHandle.redraws = 2;
				}
				else if (Context.raw.brushCanLock) {
					Context.raw.brushCanLock = false;
					Context.raw.brushLocked = true;
				}
			}
		}
		///end

		///if is_lab
		if ((Context.raw.brushCanLock || Context.raw.brushLocked) && mouse.moved) {
			if (Operator.shortcut(Config.keymap.brush_radius, ShortcutType.ShortcutDown)) {
				if (Context.raw.brushLocked) {
					Context.raw.brushRadius += mouse.movementX / 150;
					Context.raw.brushRadius = Math.max(0.01, Math.min(4.0, Context.raw.brushRadius));
					Context.raw.brushRadius = Math.round(Context.raw.brushRadius * 100) / 100;
					Context.raw.brushRadiusHandle.value = Context.raw.brushRadius;
					UIHeader.inst.headerHandle.redraws = 2;
				}
				else if (Context.raw.brushCanLock) {
					Context.raw.brushCanLock = false;
					Context.raw.brushLocked = true;
				}
			}
		}
		///end

		let isTyping = this.ui.isTyping || UIView2D.inst.ui.isTyping || UINodes.inst.ui.isTyping;

		///if (is_paint || is_sculpt)
		if (!isTyping) {
			if (Operator.shortcut(Config.keymap.select_material, ShortcutType.ShortcutDown)) {
				this.hwnds[TabArea.TabSidebar1].redraws = 2;
				for (let i = 1; i < 10; ++i) if (kb.started(i + "")) Context.selectMaterial(i - 1);
			}
			else if (Operator.shortcut(Config.keymap.select_layer, ShortcutType.ShortcutDown)) {
				this.hwnds[TabArea.TabSidebar0].redraws = 2;
				for (let i = 1; i < 10; ++i) if (kb.started(i + "")) Context.selectLayer(i - 1);
			}
		}
		///end

		// Viewport shortcuts
		if (Context.inPaintArea() && !isTyping) {

			///if is_paint
			if (!mouse.down("right")) { // Fly mode off
				if (Operator.shortcut(Config.keymap.tool_brush)) Context.selectTool(WorkspaceTool.ToolBrush);
				else if (Operator.shortcut(Config.keymap.tool_eraser)) Context.selectTool(WorkspaceTool.ToolEraser);
				else if (Operator.shortcut(Config.keymap.tool_fill)) Context.selectTool(WorkspaceTool.ToolFill);
				else if (Operator.shortcut(Config.keymap.tool_colorid)) Context.selectTool(WorkspaceTool.ToolColorId);
				else if (Operator.shortcut(Config.keymap.tool_decal)) Context.selectTool(WorkspaceTool.ToolDecal);
				else if (Operator.shortcut(Config.keymap.tool_text)) Context.selectTool(WorkspaceTool.ToolText);
				else if (Operator.shortcut(Config.keymap.tool_clone)) Context.selectTool(WorkspaceTool.ToolClone);
				else if (Operator.shortcut(Config.keymap.tool_blur)) Context.selectTool(WorkspaceTool.ToolBlur);
				else if (Operator.shortcut(Config.keymap.tool_smudge)) Context.selectTool(WorkspaceTool.ToolSmudge);
				else if (Operator.shortcut(Config.keymap.tool_particle)) Context.selectTool(WorkspaceTool.ToolParticle);
				else if (Operator.shortcut(Config.keymap.tool_picker)) Context.selectTool(WorkspaceTool.ToolPicker);
				else if (Operator.shortcut(Config.keymap.tool_bake)) Context.selectTool(WorkspaceTool.ToolBake);
				else if (Operator.shortcut(Config.keymap.tool_gizmo)) Context.selectTool(WorkspaceTool.ToolGizmo);
				else if (Operator.shortcut(Config.keymap.tool_material)) Context.selectTool(WorkspaceTool.ToolMaterial);
				else if (Operator.shortcut(Config.keymap.swap_brush_eraser)) Context.selectTool(Context.raw.tool == WorkspaceTool.ToolBrush ? WorkspaceTool.ToolEraser : WorkspaceTool.ToolBrush);
			}

			// Radius
			if (Context.raw.tool == WorkspaceTool.ToolBrush  ||
				Context.raw.tool == WorkspaceTool.ToolEraser ||
				Context.raw.tool == WorkspaceTool.ToolDecal  ||
				Context.raw.tool == WorkspaceTool.ToolText   ||
				Context.raw.tool == WorkspaceTool.ToolClone  ||
				Context.raw.tool == WorkspaceTool.ToolBlur   ||
				Context.raw.tool == WorkspaceTool.ToolSmudge   ||
				Context.raw.tool == WorkspaceTool.ToolParticle) {
				if (Operator.shortcut(Config.keymap.brush_radius) ||
					Operator.shortcut(Config.keymap.brush_opacity) ||
					Operator.shortcut(Config.keymap.brush_angle) ||
					(decalMask && Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.brush_radius))) {
					Context.raw.brushCanLock = true;
					if (!Input.getPen().connected) mouse.lock();
					Context.raw.lockStartedX = mouse.x;
					Context.raw.lockStartedY = mouse.y;
				}
				else if (Operator.shortcut(Config.keymap.brush_radius_decrease, ShortcutType.ShortcutRepeat)) {
					Context.raw.brushRadius -= this.getRadiusIncrement();
					Context.raw.brushRadius = Math.max(Math.round(Context.raw.brushRadius * 100) / 100, 0.01);
					Context.raw.brushRadiusHandle.value = Context.raw.brushRadius;
					UIHeader.inst.headerHandle.redraws = 2;
				}
				else if (Operator.shortcut(Config.keymap.brush_radius_increase, ShortcutType.ShortcutRepeat)) {
					Context.raw.brushRadius += this.getRadiusIncrement();
					Context.raw.brushRadius = Math.round(Context.raw.brushRadius * 100) / 100;
					Context.raw.brushRadiusHandle.value = Context.raw.brushRadius;
					UIHeader.inst.headerHandle.redraws = 2;
				}
				else if (decalMask) {
					if (Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.brush_radius_decrease, ShortcutType.ShortcutRepeat)) {
						Context.raw.brushDecalMaskRadius -= this.getRadiusIncrement();
						Context.raw.brushDecalMaskRadius = Math.max(Math.round(Context.raw.brushDecalMaskRadius * 100) / 100, 0.01);
						Context.raw.brushDecalMaskRadiusHandle.value = Context.raw.brushDecalMaskRadius;
						UIHeader.inst.headerHandle.redraws = 2;
					}
					else if (Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.brush_radius_increase, ShortcutType.ShortcutRepeat)) {
						Context.raw.brushDecalMaskRadius += this.getRadiusIncrement();
						Context.raw.brushDecalMaskRadius = Math.round(Context.raw.brushDecalMaskRadius * 100) / 100;
						Context.raw.brushDecalMaskRadiusHandle.value = Context.raw.brushDecalMaskRadius;
						UIHeader.inst.headerHandle.redraws = 2;
					}
				}
			}

			if (decalMask && (Operator.shortcut(Config.keymap.decal_mask, ShortcutType.ShortcutStarted) || Operator.shortcut(Config.keymap.decal_mask, ShortcutType.ShortcutReleased))) {
				UIHeader.inst.headerHandle.redraws = 2;
			}
			///end

			///if is_lab
			if (UIHeader.inst.worktab.position == SpaceType.Space3D) {
				// Radius
				if (Context.raw.tool == WorkspaceTool.ToolEraser ||
					Context.raw.tool == WorkspaceTool.ToolClone  ||
					Context.raw.tool == WorkspaceTool.ToolBlur   ||
					Context.raw.tool == WorkspaceTool.ToolSmudge) {
					if (Operator.shortcut(Config.keymap.brush_radius)) {
						Context.raw.brushCanLock = true;
						if (!Input.getPen().connected) mouse.lock();
						Context.raw.lockStartedX = mouse.x;
						Context.raw.lockStartedY = mouse.y;
					}
					else if (Operator.shortcut(Config.keymap.brush_radius_decrease, ShortcutType.ShortcutRepeat)) {
						Context.raw.brushRadius -= this.getRadiusIncrement();
						Context.raw.brushRadius = Math.max(Math.round(Context.raw.brushRadius * 100) / 100, 0.01);
						Context.raw.brushRadiusHandle.value = Context.raw.brushRadius;
						UIHeader.inst.headerHandle.redraws = 2;
					}
					else if (Operator.shortcut(Config.keymap.brush_radius_increase, ShortcutType.ShortcutRepeat)) {
						Context.raw.brushRadius += this.getRadiusIncrement();
						Context.raw.brushRadius = Math.round(Context.raw.brushRadius * 100) / 100;
						Context.raw.brushRadiusHandle.value = Context.raw.brushRadius;
						UIHeader.inst.headerHandle.redraws = 2;
					}
				}
			}
			///end

			// Viewpoint
			if (mouse.viewX < App.w()) {
				if (Operator.shortcut(Config.keymap.view_reset)) {
					Viewport.reset();
					Viewport.scaleToBounds();
				}
				else if (Operator.shortcut(Config.keymap.view_back)) Viewport.setView(0, 1, 0, Math.PI / 2, 0, Math.PI);
				else if (Operator.shortcut(Config.keymap.view_front)) Viewport.setView(0, -1, 0, Math.PI / 2, 0, 0);
				else if (Operator.shortcut(Config.keymap.view_left)) Viewport.setView(-1, 0, 0, Math.PI / 2, 0, -Math.PI / 2);
				else if (Operator.shortcut(Config.keymap.view_right)) Viewport.setView(1, 0, 0, Math.PI / 2, 0, Math.PI / 2);
				else if (Operator.shortcut(Config.keymap.view_bottom)) Viewport.setView(0, 0, -1, Math.PI, 0, Math.PI);
				else if (Operator.shortcut(Config.keymap.view_camera_type)) {
					Context.raw.cameraType = Context.raw.cameraType == CameraType.CameraPerspective ? CameraType.CameraOrthographic : CameraType.CameraPerspective;
					Context.raw.camHandle.position = Context.raw.cameraType;
					Viewport.updateCameraType(Context.raw.cameraType);
				}
				else if (Operator.shortcut(Config.keymap.view_orbit_left, ShortcutType.ShortcutRepeat)) Viewport.orbit(-Math.PI / 12, 0);
				else if (Operator.shortcut(Config.keymap.view_orbit_right, ShortcutType.ShortcutRepeat)) Viewport.orbit(Math.PI / 12, 0);
				else if (Operator.shortcut(Config.keymap.view_orbit_up, ShortcutType.ShortcutRepeat)) Viewport.orbit(0, -Math.PI / 12);
				else if (Operator.shortcut(Config.keymap.view_orbit_down, ShortcutType.ShortcutRepeat)) Viewport.orbit(0, Math.PI / 12);
				else if (Operator.shortcut(Config.keymap.view_orbit_opposite)) Viewport.orbitOpposite();
				else if (Operator.shortcut(Config.keymap.view_zoom_in, ShortcutType.ShortcutRepeat)) Viewport.zoom(0.2);
				else if (Operator.shortcut(Config.keymap.view_zoom_out, ShortcutType.ShortcutRepeat)) Viewport.zoom(-0.2);
				else if (Operator.shortcut(Config.keymap.viewport_mode)) {

					let count;

					///if (is_paint || is_sculpt)
					count = 16;
					///if (krom_direct3d12 || krom_vulkan || krom_metal)
					count += 1;
					///end
					///end

					///if is_lab
					count = 9;
					///if (krom_direct3d12 || krom_vulkan || krom_metal)
					count += 1;
					///end
					///end

					UIMenu.draw((ui: Zui) => {
						let modeHandle = Zui.handle("uibase_0");
						modeHandle.position = Context.raw.viewportMode;
						ui.text(tr("Viewport Mode"), Align.Right, ui.t.HIGHLIGHT_COL);
						let modes = [
							tr("Lit"),
							tr("Base Color"),
							tr("Normal"),
							tr("Occlusion"),
							tr("Roughness"),
							tr("Metallic"),
							tr("Opacity"),
							tr("Height"),
							///if (is_paint || is_sculpt)
							tr("Emission"),
							tr("Subsurface"),
							tr("TexCoord"),
							tr("Object Normal"),
							tr("Material ID"),
							tr("Object ID"),
							tr("Mask")
							///end
						];

						let shortcuts = ["l", "b", "n", "o", "r", "m", "a", "h", "e", "s", "t", "1", "2", "3", "4"];

						///if (krom_direct3d12 || krom_vulkan || krom_metal)
						if (Krom.raytraceSupported()) {
							modes.push(tr("Path Traced"));
							shortcuts.push("p");
						}
						///end

						for (let i = 0; i < modes.length; ++i) {
							ui.radio(modeHandle, i, modes[i], shortcuts[i]);
						}

						let index = shortcuts.indexOf(Keyboard.keyCode(ui.key));
						if (ui.isKeyPressed && index != -1) {
							modeHandle.position = index;
							ui.changed = true;
							Context.setViewportMode(modeHandle.position);
						}
						else if (modeHandle.changed) {
							Context.setViewportMode(modeHandle.position);
							ui.changed = true;
						}
					}, count);
				}
			}

			if (Operator.shortcut(Config.keymap.operator_search)) this.operatorSearch();
		}

		if (Context.raw.brushCanLock || Context.raw.brushLocked) {
			if (mouse.moved && Context.raw.brushCanUnlock) {
				Context.raw.brushLocked = false;
				Context.raw.brushCanUnlock = false;
			}

			///if (is_paint || is_sculpt)
			let b = (Context.raw.brushCanLock || Context.raw.brushLocked) &&
				!Operator.shortcut(Config.keymap.brush_radius, ShortcutType.ShortcutDown) &&
				!Operator.shortcut(Config.keymap.brush_opacity, ShortcutType.ShortcutDown) &&
				!Operator.shortcut(Config.keymap.brush_angle, ShortcutType.ShortcutDown) &&
				!(decalMask && Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.brush_radius, ShortcutType.ShortcutDown));
			///end
			///if is_lab
			let b = (Context.raw.brushCanLock || Context.raw.brushLocked) &&
				!Operator.shortcut(Config.keymap.brush_radius, ShortcutType.ShortcutDown);
			///end

			if (b) {
				mouse.unlock();
				Context.raw.lastPaintX = -1;
				Context.raw.lastPaintY = -1;
				if (Context.raw.brushCanLock) {
					Context.raw.brushCanLock = false;
					Context.raw.brushCanUnlock = false;
					Context.raw.brushLocked = false;
				}
				else {
					Context.raw.brushCanUnlock = true;
				}
			}
		}

		///if (is_paint || is_sculpt)
		if (this.borderHandle_ptr != 0) {
			if (this.borderHandle_ptr == UINodes.inst.hwnd.ptr || this.borderHandle_ptr == UIView2D.inst.hwnd.ptr) {
				if (this.borderStarted == BorderSide.SideLeft) {
					Config.raw.layout[LayoutSize.LayoutNodesW] -= Math.floor(mouse.movementX);
					if (Config.raw.layout[LayoutSize.LayoutNodesW] < 32) Config.raw.layout[LayoutSize.LayoutNodesW] = 32;
					else if (Config.raw.layout[LayoutSize.LayoutNodesW] > System.width * 0.7) Config.raw.layout[LayoutSize.LayoutNodesW] = Math.floor(System.width * 0.7);
				}
				else { // UINodes / UIView2D ratio
					Config.raw.layout[LayoutSize.LayoutNodesH] -= Math.floor(mouse.movementY);
					if (Config.raw.layout[LayoutSize.LayoutNodesH] < 32) Config.raw.layout[LayoutSize.LayoutNodesH] = 32;
					else if (Config.raw.layout[LayoutSize.LayoutNodesH] > App.h() * 0.95) Config.raw.layout[LayoutSize.LayoutNodesH] = Math.floor(App.h() * 0.95);
				}
			}
			else if (this.borderHandle_ptr == this.hwnds[TabArea.TabStatus].ptr) {
				let my = Math.floor(mouse.movementY);
				if (Config.raw.layout[LayoutSize.LayoutStatusH] - my >= UIStatus.defaultStatusH * Config.raw.window_scale && Config.raw.layout[LayoutSize.LayoutStatusH] - my < System.height * 0.7) {
					Config.raw.layout[LayoutSize.LayoutStatusH] -= my;
				}
			}
			else {
				if (this.borderStarted == BorderSide.SideLeft) {
					Config.raw.layout[LayoutSize.LayoutSidebarW] -= Math.floor(mouse.movementX);
					if (Config.raw.layout[LayoutSize.LayoutSidebarW] < UIBase.sidebarMiniW) Config.raw.layout[LayoutSize.LayoutSidebarW] = UIBase.sidebarMiniW;
					else if (Config.raw.layout[LayoutSize.LayoutSidebarW] > System.width - UIBase.sidebarMiniW) Config.raw.layout[LayoutSize.LayoutSidebarW] = System.width - UIBase.sidebarMiniW;
				}
				else {
					let my = Math.floor(mouse.movementY);
					if (this.borderHandle_ptr == this.hwnds[TabArea.TabSidebar1].ptr && this.borderStarted == BorderSide.SideTop) {
						if (Config.raw.layout[LayoutSize.LayoutSidebarH0] + my > 32 && Config.raw.layout[LayoutSize.LayoutSidebarH1] - my > 32) {
							Config.raw.layout[LayoutSize.LayoutSidebarH0] += my;
							Config.raw.layout[LayoutSize.LayoutSidebarH1] -= my;
						}
					}
				}
			}
		}
		///end

		///if is_lab
		if (this.borderHandle_ptr != 0) {
			if (this.borderHandle_ptr == UINodes.inst.hwnd.ptr || this.borderHandle_ptr == UIView2D.inst.hwnd.ptr) {
				if (this.borderStarted == BorderSide.SideLeft) {
					Config.raw.layout[LayoutSize.LayoutNodesW] -= Math.floor(mouse.movementX);
					if (Config.raw.layout[LayoutSize.LayoutNodesW] < 32) Config.raw.layout[LayoutSize.LayoutNodesW] = 32;
					else if (Config.raw.layout[LayoutSize.LayoutNodesW] > System.width * 0.7) Config.raw.layout[LayoutSize.LayoutNodesW] = Math.floor(System.width * 0.7);
				}
				else { // UINodes / UIView2D ratio
					Config.raw.layout[LayoutSize.LayoutNodesH] -= Math.floor(mouse.movementY);
					if (Config.raw.layout[LayoutSize.LayoutNodesH] < 32) Config.raw.layout[LayoutSize.LayoutNodesH] = 32;
					else if (Config.raw.layout[LayoutSize.LayoutNodesH] > App.h() * 0.95) Config.raw.layout[LayoutSize.LayoutNodesH] = Math.floor(App.h() * 0.95);
				}
			}
			else if (this.borderHandle_ptr == this.hwnds[TabArea.TabStatus].ptr) {
				let my = Math.floor(mouse.movementY);
				if (Config.raw.layout[LayoutSize.LayoutStatusH] - my >= UIStatus.defaultStatusH * Config.raw.window_scale && Config.raw.layout[LayoutSize.LayoutStatusH] - my < System.height * 0.7) {
					Config.raw.layout[LayoutSize.LayoutStatusH] -= my;
				}
			}
		}
		///end

		if (!mouse.down()) {
			this.borderHandle_ptr = 0;
			Base.isResizing = false;
		}

		///if arm_physics
		if (Context.raw.tool == WorkspaceTool.ToolParticle && Context.raw.particlePhysics && Context.inPaintArea() && !Context.raw.paint2d) {
			UtilParticle.initParticlePhysics();
			let world = PhysicsWorld.active;
			world.lateUpdate();
			Context.raw.ddirty = 2;
			Context.raw.rdirty = 2;
			if (mouse.started()) {
				if (Context.raw.particleTimer != null) {
					Tween.stop(Context.raw.particleTimer);
					Context.raw.particleTimer.done();
					Context.raw.particleTimer = null;
				}
				History.pushUndo = true;
				Context.raw.particleHitX = Context.raw.particleHitY = Context.raw.particleHitZ = 0;
				Scene.active.spawnObject(".Sphere", null, (o: Object) => {
					Data.getMaterial("Scene", ".Gizmo", (md: MaterialData) => {
						let mo: MeshObject = o as MeshObject;
						mo.name = ".Bullet";
						mo.materials[0] = md;
						mo.visible = true;

						let camera = Scene.active.camera;
						let ct = camera.transform;
						mo.transform.loc.set(ct.worldx(), ct.worldy(), ct.worldz());
						mo.transform.scale.set(Context.raw.brushRadius * 0.2, Context.raw.brushRadius * 0.2, Context.raw.brushRadius * 0.2);
						mo.transform.buildMatrix();

						let body = new PhysicsBody();
						body.shape = ShapeType.ShapeSphere;
						body.mass = 1.0;
						body.ccd = true;
						mo.transform.radius /= 10; // Lower ccd radius
						body.init(mo);
						mo.addTrait(body);
						mo.transform.radius *= 10;

						let ray = RayCaster.getRay(mouse.viewX, mouse.viewY, camera);
						body.applyImpulse(ray.direction.mult(0.15));

						Context.raw.particleTimer = Tween.timer(5, mo.remove);
					});
				});
			}

			let pairs = world.getContactPairs(Context.raw.paintBody);
			if (pairs != null) {
				for (let p of pairs) {
					Context.raw.lastParticleHitX = Context.raw.particleHitX != 0 ? Context.raw.particleHitX : p.posA.x;
					Context.raw.lastParticleHitY = Context.raw.particleHitY != 0 ? Context.raw.particleHitY : p.posA.y;
					Context.raw.lastParticleHitZ = Context.raw.particleHitZ != 0 ? Context.raw.particleHitZ : p.posA.z;
					Context.raw.particleHitX = p.posA.x;
					Context.raw.particleHitY = p.posA.y;
					Context.raw.particleHitZ = p.posA.z;
					Context.raw.pdirty = 1;
					break; // 1 pair for now
				}
			}
		}
		///end
	}

	view_top = () => {
		let isTyping = this.ui.isTyping || UIView2D.inst.ui.isTyping || UINodes.inst.ui.isTyping;

		let mouse = Input.getMouse();
		if (Context.inPaintArea() && !isTyping) {
			if (mouse.viewX < App.w()) {
				Viewport.setView(0, 0, 1, 0, 0, 0);
			}
		}
	}

	operatorSearch = () => {
		let kb = Input.getKeyboard();
		let searchHandle = Zui.handle("uibase_1");
		let first = true;
		UIMenu.draw((ui: Zui) => {
			ui.fill(0, 0, ui._w / ui.SCALE(), ui.t.ELEMENT_H * 8, ui.t.SEPARATOR_COL);
			let search = ui.textInput(searchHandle, "", Align.Left, true, true);
			ui.changed = false;
			if (first) {
				first = false;
				searchHandle.text = "";
				ui.startTextEdit(searchHandle); // Focus search bar
			}

			if (searchHandle.changed) this.operatorSearchOffset = 0;

			if (ui.isKeyPressed) { // Move selection
				if (ui.key == KeyCode.Down && this.operatorSearchOffset < 6) this.operatorSearchOffset++;
				if (ui.key == KeyCode.Up && this.operatorSearchOffset > 0) this.operatorSearchOffset--;
			}
			let enter = kb.down("enter");
			let count = 0;
			let BUTTON_COL = ui.t.BUTTON_COL;

			for (let n in Config.keymap) {
				if (n.indexOf(search) >= 0) {
					ui.t.BUTTON_COL = count == this.operatorSearchOffset ? ui.t.HIGHLIGHT_COL : ui.t.SEPARATOR_COL;
					if (ui.button(n, Align.Left, Config.keymap[n]) || (enter && count == this.operatorSearchOffset)) {
						if (enter) {
							ui.changed = true;
							count = 6; // Trigger break
						}
						Operator.run(n);
					}
					if (++count > 6) break;
				}
			}

			if (enter && count == 0) { // Hide popup on enter when command is not found
				ui.changed = true;
				searchHandle.text = "";
			}
			ui.t.BUTTON_COL = BUTTON_COL;
		}, 8, -1, -1);
	}

	toggleDistractFree = () => {
		this.show = !this.show;
		Base.resize();
	}

	getRadiusIncrement = (): f32 => {
		return 0.1;
	}

	static hitRect = (mx: f32, my: f32, x: i32, y: i32, w: i32, h: i32) => {
		return mx > x && mx < x + w && my > y && my < y + h;
	}

	///if (is_paint || is_sculpt)
	getBrushStencilRect = (): TRect => {
		let w = Math.floor(Context.raw.brushStencilImage.width * (Base.h() / Context.raw.brushStencilImage.height) * Context.raw.brushStencilScale);
		let h = Math.floor(Base.h() * Context.raw.brushStencilScale);
		let x = Math.floor(Base.x() + Context.raw.brushStencilX * Base.w());
		let y = Math.floor(Base.y() + Context.raw.brushStencilY * Base.h());
		return { w: w, h: h, x: x, y: y };
	}
	///end

	updateUI = () => {
		if (Console.messageTimer > 0) {
			Console.messageTimer -= Time.delta;
			if (Console.messageTimer <= 0) this.hwnds[TabArea.TabStatus].redraws = 2;
		}

		///if (is_paint || is_sculpt)
		UIBase.sidebarMiniW = Math.floor(UIBase.defaultSidebarMiniW * this.ui.SCALE());
		///end

		if (!Base.uiEnabled) return;

		let mouse = Input.getMouse();
		let kb = Input.getKeyboard();

		///if (is_paint || is_sculpt)
		// Same mapping for paint and rotate (predefined in touch keymap)
		if (Context.inViewport()) {
			if (mouse.started() && Config.keymap.action_paint == Config.keymap.action_rotate) {
				this.action_paint_remap = Config.keymap.action_paint;
				UtilRender.pickPosNorTex();
				let isMesh = Math.abs(Context.raw.posXPicked) < 50 && Math.abs(Context.raw.posYPicked) < 50 && Math.abs(Context.raw.posZPicked) < 50;
				///if krom_android
				// Allow rotating with both pen and touch, because hovering a pen prevents touch input on android
				let penOnly = false;
				///else
				let penOnly = Context.raw.penPaintingOnly;
				///end
				let isPen = penOnly && Input.getPen().down();
				// Mesh picked - disable rotate
				// Pen painting only - rotate with touch, paint with pen
				if ((isMesh && !penOnly) || isPen) {
					Config.keymap.action_rotate = "";
					Config.keymap.action_paint = this.action_paint_remap;
				}
				// World sphere picked - disable paint
				else {
					Config.keymap.action_paint = "";
					Config.keymap.action_rotate = this.action_paint_remap;
				}
			}
			else if (!mouse.down() && this.action_paint_remap != "") {
				Config.keymap.action_rotate = this.action_paint_remap;
				Config.keymap.action_paint = this.action_paint_remap;
				this.action_paint_remap = "";
			}
		}

		if (Context.raw.brushStencilImage != null && Operator.shortcut(Config.keymap.stencil_transform, ShortcutType.ShortcutDown)) {
			let r = this.getBrushStencilRect();
			if (mouse.started("left")) {
				Context.raw.brushStencilScaling =
					UIBase.hitRect(mouse.x, mouse.y, r.x - 8,       r.y - 8,       16, 16) ||
					UIBase.hitRect(mouse.x, mouse.y, r.x - 8,       r.h + r.y - 8, 16, 16) ||
					UIBase.hitRect(mouse.x, mouse.y, r.w + r.x - 8, r.y - 8,       16, 16) ||
					UIBase.hitRect(mouse.x, mouse.y, r.w + r.x - 8, r.h + r.y - 8, 16, 16);
				let cosa = Math.cos(-Context.raw.brushStencilAngle);
				let sina = Math.sin(-Context.raw.brushStencilAngle);
				let ox = 0;
				let oy = -r.h / 2;
				let x = ox * cosa - oy * sina;
				let y = ox * sina + oy * cosa;
				x += r.x + r.w / 2;
				y += r.y + r.h / 2;
				Context.raw.brushStencilRotating =
					UIBase.hitRect(mouse.x, mouse.y, Math.floor(x - 16), Math.floor(y - 16), 32, 32);
			}
			let _scale = Context.raw.brushStencilScale;
			if (mouse.down("left")) {
				if (Context.raw.brushStencilScaling) {
					let mult = mouse.x > r.x + r.w / 2 ? 1 : -1;
					Context.raw.brushStencilScale += mouse.movementX / 400 * mult;
				}
				else if (Context.raw.brushStencilRotating) {
					let gizmoX = r.x + r.w / 2;
					let gizmoY = r.y + r.h / 2;
					Context.raw.brushStencilAngle = -Math.atan2(mouse.y - gizmoY, mouse.x - gizmoX) - Math.PI / 2;
				}
				else {
					Context.raw.brushStencilX += mouse.movementX / Base.w();
					Context.raw.brushStencilY += mouse.movementY / Base.h();
				}
			}
			else Context.raw.brushStencilScaling = false;
			if (mouse.wheelDelta != 0) {
				Context.raw.brushStencilScale -= mouse.wheelDelta / 10;
			}
			// Center after scale
			let ratio = Base.h() / Context.raw.brushStencilImage.height;
			let oldW = _scale * Context.raw.brushStencilImage.width * ratio;
			let newW = Context.raw.brushStencilScale * Context.raw.brushStencilImage.width * ratio;
			let oldH = _scale * Base.h();
			let newH = Context.raw.brushStencilScale * Base.h();
			Context.raw.brushStencilX += (oldW - newW) / Base.w() / 2;
			Context.raw.brushStencilY += (oldH - newH) / Base.h() / 2;
		}
		///end

		let setCloneSource = Context.raw.tool == WorkspaceTool.ToolClone && Operator.shortcut(Config.keymap.set_clone_source + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown);

		///if (is_paint || is_sculpt)
		let decal = Context.raw.tool == WorkspaceTool.ToolDecal || Context.raw.tool == WorkspaceTool.ToolText;
		let decalMask = decal && Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown);
		let down = Operator.shortcut(Config.keymap.action_paint, ShortcutType.ShortcutDown) ||
				   decalMask ||
				   setCloneSource ||
				   Operator.shortcut(Config.keymap.brush_ruler + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown) ||
				   (Input.getPen().down() && !kb.down("alt"));
		///end
		///if is_lab
		let down = Operator.shortcut(Config.keymap.action_paint, ShortcutType.ShortcutDown) ||
				   setCloneSource ||
				   Operator.shortcut(Config.keymap.brush_ruler + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown) ||
				   (Input.getPen().down() && !kb.down("alt"));
		///end

		if (Config.raw.touch_ui) {
			if (Input.getPen().down()) {
				Context.raw.penPaintingOnly = true;
			}
			else if (Context.raw.penPaintingOnly) {
				down = false;
			}
		}

		///if arm_physics
		if (Context.raw.tool == WorkspaceTool.ToolParticle && Context.raw.particlePhysics) {
			down = false;
		}
		///end

		///if (is_paint || is_sculpt)
		///if krom_ios
		// No hover on iPad, decals are painted by pen release
		if (decal) {
			down = Input.getPen().released();
			if (!Context.raw.penPaintingOnly) {
				down = down || Input.getMouse().released();
			}
		}
		///end
		///end

		if (down) {
			let mx = mouse.viewX;
			let my = mouse.viewY;
			let ww = App.w();

			///if (is_paint || is_sculpt)
			if (Context.raw.paint2d) {
				mx -= App.w();
				ww = UIView2D.inst.ww;
			}
			///end

			if (mx < ww &&
				mx > App.x() &&
				my < App.h() &&
				my > App.y()) {

				if (setCloneSource) {
					Context.raw.cloneStartX = mx;
					Context.raw.cloneStartY = my;
				}
				else {
					if (Context.raw.brushTime == 0 &&
						!Base.isDragging &&
						!Base.isResizing &&
						!Base.isComboSelected()) { // Paint started

						// Draw line
						if (Operator.shortcut(Config.keymap.brush_ruler + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown)) {
							Context.raw.lastPaintVecX = Context.raw.lastPaintX;
							Context.raw.lastPaintVecY = Context.raw.lastPaintY;
						}

						///if (is_paint || is_sculpt)
						History.pushUndo = true;

						if (Context.raw.tool == WorkspaceTool.ToolClone && Context.raw.cloneStartX >= 0.0) { // Clone delta
							Context.raw.cloneDeltaX = (Context.raw.cloneStartX - mx) / ww;
							Context.raw.cloneDeltaY = (Context.raw.cloneStartY - my) / App.h();
							Context.raw.cloneStartX = -1;
						}
						else if (Context.raw.tool == WorkspaceTool.ToolParticle) {
							// Reset particles
							///if arm_particles
							let emitter: MeshObject = Scene.active.getChild(".ParticleEmitter") as MeshObject;
							let psys = emitter.particleSystems[0];
							psys.time = 0;
							// psys.time = psys.seed * psys.animtime;
							// psys.seed++;
							///end
						}
						else if (Context.raw.tool == WorkspaceTool.ToolFill && Context.raw.fillTypeHandle.position == FillType.FillUVIsland) {
							UtilUV.uvislandmapCached = false;
						}
						///end
					}

					Context.raw.brushTime += Time.delta;

					///if (is_paint || is_sculpt)
					if (Context.raw.runBrush != null) {
						Context.raw.runBrush(0);
					}
					///end
					///if is_lab
					if (Context.runBrush != null) {
						Context.runBrush(0);
					}
					///end
				}
			}
		}
		else if (Context.raw.brushTime > 0) { // Brush released
			Context.raw.brushTime = 0;
			Context.raw.prevPaintVecX = -1;
			Context.raw.prevPaintVecY = -1;
			///if (!krom_direct3d12 && !krom_vulkan && !krom_metal) // Keep accumulated samples for D3D12
			Context.raw.ddirty = 3;
			///end
			Context.raw.brushBlendDirty = true; // Update brush mask

			///if (is_paint || is_sculpt)
			Context.raw.layerPreviewDirty = true; // Update layer preview
			///end

			///if is_paint
			// New color id picked, update fill layer
			if (Context.raw.tool == WorkspaceTool.ToolColorId && Context.raw.layer.fill_layer != null) {
				Base.notifyOnNextFrame(() => {
					Base.updateFillLayer();
					MakeMaterial.parsePaintMaterial(false);
				});
			}
			///end
		}

		///if is_paint
		if (Context.raw.layersPreviewDirty) {
			Context.raw.layersPreviewDirty = false;
			Context.raw.layerPreviewDirty = false;
			Context.raw.maskPreviewLast = null;
			if (Base.pipeMerge == null) Base.makePipe();
			// Update all layer previews
			for (let l of Project.layers) {
				if (l.isGroup()) continue;
				let target = l.texpaint_preview;
				let source = l.texpaint;
				let g2 = target.g2;
				g2.begin(true, 0x00000000);
				// g2.pipeline = l.isMask() ? Base.pipeCopy8 : Base.pipeCopy;
				g2.pipeline = Base.pipeCopy; // texpaint_preview is always RGBA32 for now
				g2.drawScaledImage(source, 0, 0, target.width, target.height);
				g2.pipeline = null;
				g2.end();
			}
			this.hwnds[TabArea.TabSidebar0].redraws = 2;
		}
		if (Context.raw.layerPreviewDirty && !Context.raw.layer.isGroup()) {
			Context.raw.layerPreviewDirty = false;
			Context.raw.maskPreviewLast = null;
			if (Base.pipeMerge == null) Base.makePipe();
			// Update layer preview
			let l = Context.raw.layer;
			let target = l.texpaint_preview;
			let source = l.texpaint;
			let g2 = target.g2;
			g2.begin(true, 0x00000000);
			// g2.pipeline = Context.raw.layer.isMask() ? Base.pipeCopy8 : Base.pipeCopy;
			g2.pipeline = Base.pipeCopy; // texpaint_preview is always RGBA32 for now
			g2.drawScaledImage(source, 0, 0, target.width, target.height);
			g2.pipeline = null;
			g2.end();
			this.hwnds[TabArea.TabSidebar0].redraws = 2;
		}
		///end

		let undoPressed = Operator.shortcut(Config.keymap.edit_undo);
		let redoPressed = Operator.shortcut(Config.keymap.edit_redo) ||
						  (kb.down("control") && kb.started("y"));

		// Two-finger tap to undo, three-finger tap to redo
		if (Context.inViewport() && Config.raw.touch_ui) {
			if (mouse.started("middle")) { this.redoTapTime = Time.time(); }
			else if (mouse.started("right")) { this.undoTapTime = Time.time(); }
			else if (mouse.released("middle") && Time.time() - this.redoTapTime < 0.1) { this.redoTapTime = this.undoTapTime = 0; redoPressed = true; }
			else if (mouse.released("right") && Time.time() - this.undoTapTime < 0.1) { this.redoTapTime = this.undoTapTime = 0; undoPressed = true; }
		}

		if (undoPressed) History.undo();
		else if (redoPressed) History.redo();

		///if (is_paint || is_sculpt)
		Gizmo.update();
		///end
	}

	render = (g: Graphics2) => {
		if (!this.show && Config.raw.touch_ui) {
			this.ui.inputEnabled = true;
			g.end();
			this.ui.begin(g);
			if (this.ui.window(Zui.handle("uibase_2"), 0, 0, 150, Math.floor(this.ui.ELEMENT_H() + this.ui.ELEMENT_OFFSET() + 1))) {
				if (this.ui.button(tr("Close"))) {
					this.toggleDistractFree();
				}
			}
			this.ui.end();
			g.begin(false);
		}

		if (!this.show || System.width == 0 || System.height == 0) return;

		this.ui.inputEnabled = Base.uiEnabled;

		// Remember last tab positions
		for (let i = 0; i < this.htabs.length; ++i) {
			if (this.htabs[i].changed) {
				Config.raw.layout_tabs[i] = this.htabs[i].position;
				Config.save();
			}
		}

		// Set tab positions
		for (let i = 0; i < this.htabs.length; ++i) {
			this.htabs[i].position = Config.raw.layout_tabs[i];
		}

		g.end();
		this.ui.begin(g);

		///if (is_paint || is_sculpt)
		UIToolbar.inst.renderUI(g);
		///end
		UIMenubar.inst.renderUI(g);
		UIHeader.inst.renderUI(g);
		UIStatus.inst.renderUI(g);

		///if (is_paint || is_sculpt)
		this.drawSidebar();
		///end

		this.ui.end();
		g.begin(false);
	}

	///if (is_paint || is_sculpt)
	drawSidebar = () => {
		// Tabs
		let mini = Config.raw.layout[LayoutSize.LayoutSidebarW] <= UIBase.sidebarMiniW;
		let expandButtonOffset = Config.raw.touch_ui ? Math.floor(this.ui.ELEMENT_H() + this.ui.ELEMENT_OFFSET()) : 0;
		this.tabx = System.width - Config.raw.layout[LayoutSize.LayoutSidebarW];

		let _SCROLL_W = this.ui.t.SCROLL_W;
		if (mini) this.ui.t.SCROLL_W = this.ui.t.SCROLL_MINI_W;

		if (this.ui.window(this.hwnds[TabArea.TabSidebar0], this.tabx, 0, Config.raw.layout[LayoutSize.LayoutSidebarW], Config.raw.layout[LayoutSize.LayoutSidebarH0])) {
			for (let i = 0; i < (mini ? 1 : this.hwndTabs[TabArea.TabSidebar0].length); ++i) this.hwndTabs[TabArea.TabSidebar0][i](this.htabs[TabArea.TabSidebar0]);
		}
		if (this.ui.window(this.hwnds[TabArea.TabSidebar1], this.tabx, Config.raw.layout[LayoutSize.LayoutSidebarH0], Config.raw.layout[LayoutSize.LayoutSidebarW], Config.raw.layout[LayoutSize.LayoutSidebarH1] - expandButtonOffset)) {
			for (let i = 0; i < (mini ? 1 : this.hwndTabs[TabArea.TabSidebar1].length); ++i) this.hwndTabs[TabArea.TabSidebar1][i](this.htabs[TabArea.TabSidebar1]);
		}

		this.ui.endWindow();
		this.ui.t.SCROLL_W = _SCROLL_W;

		// Collapse / expand button for mini sidebar
		if (Config.raw.touch_ui) {
			let width = Config.raw.layout[LayoutSize.LayoutSidebarW];
			let height = Math.floor(this.ui.ELEMENT_H() + this.ui.ELEMENT_OFFSET());
			if (this.ui.window(Zui.handle("uibase_3"), System.width - width, System.height - height, width, height + 1)) {
				this.ui._w = width;
				let _BUTTON_H = this.ui.t.BUTTON_H;
				let _BUTTON_COL = this.ui.t.BUTTON_COL;
				this.ui.t.BUTTON_H = this.ui.t.ELEMENT_H;
				this.ui.t.BUTTON_COL = this.ui.t.WINDOW_BG_COL;
				if (this.ui.button(mini ? "<<" : ">>")) {
					Config.raw.layout[LayoutSize.LayoutSidebarW] = mini ? UIBase.defaultSidebarFullW : UIBase.defaultSidebarMiniW;
					Config.raw.layout[LayoutSize.LayoutSidebarW] = Math.floor(Config.raw.layout[LayoutSize.LayoutSidebarW] * this.ui.SCALE());
				}
				this.ui.t.BUTTON_H = _BUTTON_H;
				this.ui.t.BUTTON_COL = _BUTTON_COL;
			}
		}

		// Expand button
		if (Config.raw.layout[LayoutSize.LayoutSidebarW] == 0) {
			let width = Math.floor(this.ui.font.width(this.ui.fontSize, "<<") + 25 * this.ui.SCALE());
			if (this.ui.window(this.hminimized, System.width - width, 0, width, Math.floor(this.ui.ELEMENT_H() + this.ui.ELEMENT_OFFSET() + 1))) {
				this.ui._w = width;
				let _BUTTON_H = this.ui.t.BUTTON_H;
				let _BUTTON_COL = this.ui.t.BUTTON_COL;
				this.ui.t.BUTTON_H = this.ui.t.ELEMENT_H;
				this.ui.t.BUTTON_COL = this.ui.t.SEPARATOR_COL;

				if (this.ui.button("<<")) {
					Config.raw.layout[LayoutSize.LayoutSidebarW] = Context.raw.maximizedSidebarWidth != 0 ? Context.raw.maximizedSidebarWidth : Math.floor(UIBase.defaultSidebarW * Config.raw.window_scale);
				}
				this.ui.t.BUTTON_H = _BUTTON_H;
				this.ui.t.BUTTON_COL = _BUTTON_COL;
			}
		}
		else if (this.htabs[TabArea.TabSidebar0].changed && this.htabs[TabArea.TabSidebar0].position == Context.raw.lastHtab0Position) {
			if (Time.time() - Context.raw.selectTime < 0.25) {
				Context.raw.maximizedSidebarWidth = Config.raw.layout[LayoutSize.LayoutSidebarW];
				Config.raw.layout[LayoutSize.LayoutSidebarW] = 0;
			}
			Context.raw.selectTime = Time.time();
		}
		Context.raw.lastHtab0Position = this.htabs[TabArea.TabSidebar0].position;
	}

	renderCursor = (g: Graphics2) => {
		if (!Base.uiEnabled) return;

		///if is_paint
		if (Context.raw.tool == WorkspaceTool.ToolMaterial || Context.raw.tool == WorkspaceTool.ToolBake) return;
		///end

		g.color = 0xffffffff;

		Context.raw.viewIndex = Context.raw.viewIndexLast;
		let mx = Base.x() + Context.raw.paintVec.x * Base.w();
		let my = Base.y() + Context.raw.paintVec.y * Base.h();
		Context.raw.viewIndex = -1;

		// Radius being scaled
		if (Context.raw.brushLocked) {
			mx += Context.raw.lockStartedX - System.width / 2;
			my += Context.raw.lockStartedY - System.height / 2;
		}

		let tool = Context.raw.tool as WorkspaceTool;

		///if is_paint
		if (Context.raw.brushStencilImage != null &&
			tool != WorkspaceTool.ToolBake &&
			tool != WorkspaceTool.ToolPicker &&
			tool != WorkspaceTool.ToolMaterial &&
			tool != WorkspaceTool.ToolColorId) {
			let r = this.getBrushStencilRect();
			if (!Operator.shortcut(Config.keymap.stencil_hide, ShortcutType.ShortcutDown)) {
				g.color = 0x88ffffff;
				let angle = Context.raw.brushStencilAngle;
				let cx = r.x + r.w / 2;
				let cy = r.y + r.h / 2;
				g.transformation = Mat3.translation(cx, cy).multmat(Mat3.rotation(-angle)).multmat(Mat3.translation(-cx, -cy));
				g.drawScaledImage(Context.raw.brushStencilImage, r.x, r.y, r.w, r.h);
				g.transformation = null;
				g.color = 0xffffffff;
			}
			let transform = Operator.shortcut(Config.keymap.stencil_transform, ShortcutType.ShortcutDown);
			if (transform) {
				// Outline
				g.drawRect(r.x, r.y, r.w, r.h);
				// Scale
				g.drawRect(r.x - 8,       r.y - 8,       16, 16);
				g.drawRect(r.x - 8 + r.w, r.y - 8,       16, 16);
				g.drawRect(r.x - 8,       r.y - 8 + r.h, 16, 16);
				g.drawRect(r.x - 8 + r.w, r.y - 8 + r.h, 16, 16);
				// Rotate
				let angle = Context.raw.brushStencilAngle;
				let cx = r.x + r.w / 2;
				let cy = r.y + r.h / 2;
				g.transformation = Mat3.translation(cx, cy).multmat(Mat3.rotation(-angle)).multmat(Mat3.translation(-cx, -cy));
				g.fillCircle(r.x + r.w / 2, r.y - 4, 8);
				g.transformation = null;
			}
		}
		///end

		// Show picked material next to cursor
		if (Context.raw.tool == WorkspaceTool.ToolPicker && Context.raw.pickerSelectMaterial && Context.raw.colorPickerCallback == null) {
			let img = Context.raw.material.imageIcon;
			///if krom_opengl
			g.drawScaledImage(img, mx + 10, my + 10 + img.height, img.width, -img.height);
			///else
			g.drawImage(img, mx + 10, my + 10);
			///end
		}
		if (Context.raw.tool == WorkspaceTool.ToolPicker && Context.raw.colorPickerCallback != null) {
			let img = Res.get("icons.k");
			let rect = Res.tile50(img, WorkspaceTool.ToolPicker, 0);
			g.drawSubImage(img, mx + 10, my + 10, rect.x, rect.y, rect.w, rect.h);
		}

		let cursorImg = Res.get("cursor.k");
		let psize = Math.floor(cursorImg.width * (Context.raw.brushRadius * Context.raw.brushNodesRadius) * this.ui.SCALE());

		// Clone source cursor
		let mouse = Input.getMouse();
		let pen = Input.getPen();
		let kb = Input.getKeyboard();
		if (Context.raw.tool == WorkspaceTool.ToolClone && !kb.down("alt") && (mouse.down() || pen.down())) {
			g.color = 0x66ffffff;
			g.drawScaledImage(cursorImg, mx + Context.raw.cloneDeltaX * App.w() - psize / 2, my + Context.raw.cloneDeltaY * App.h() - psize / 2, psize, psize);
			g.color = 0xffffffff;
		}

		let decal = Context.raw.tool == WorkspaceTool.ToolDecal || Context.raw.tool == WorkspaceTool.ToolText;

		if (!Config.raw.brush_3d || Context.in2dView() || decal) {
			let decalMask = decal && Operator.shortcut(Config.keymap.decal_mask, ShortcutType.ShortcutDown);
			if (decal && !Context.inNodes()) {
				let decalAlpha = 0.5;
				if (!decalMask) {
					Context.raw.decalX = Context.raw.paintVec.x;
					Context.raw.decalY = Context.raw.paintVec.y;
					decalAlpha = Context.raw.brushOpacity;

					// Radius being scaled
					if (Context.raw.brushLocked) {
						Context.raw.decalX += (Context.raw.lockStartedX - System.width / 2) / Base.w();
						Context.raw.decalY += (Context.raw.lockStartedY - System.height / 2) / Base.h();
					}
				}

				if (!Config.raw.brush_live) {
					let psizex = Math.floor(256 * this.ui.SCALE() * (Context.raw.brushRadius * Context.raw.brushNodesRadius * Context.raw.brushScaleX));
					let psizey = Math.floor(256 * this.ui.SCALE() * (Context.raw.brushRadius * Context.raw.brushNodesRadius));

					Context.raw.viewIndex = Context.raw.viewIndexLast;
					let decalX = Base.x() + Context.raw.decalX * Base.w() - psizex / 2;
					let decalY = Base.y() + Context.raw.decalY * Base.h() - psizey / 2;
					Context.raw.viewIndex = -1;

					g.color = color_from_floats(1, 1, 1, decalAlpha);
					let angle = (Context.raw.brushAngle + Context.raw.brushNodesAngle) * (Math.PI / 180);
					let cx = decalX + psizex / 2;
					let cy = decalY + psizey / 2;
					g.transformation = Mat3.translation(cx, cy).multmat(Mat3.rotation(angle)).multmat(Mat3.translation(-cx, -cy));
					///if (krom_direct3d11 || krom_direct3d12 || krom_metal || krom_vulkan)
					g.drawScaledImage(Context.raw.decalImage, decalX, decalY, psizex, psizey);
					///else
					g.drawScaledImage(Context.raw.decalImage, decalX, decalY + psizey, psizex, -psizey);
					///end
					g.transformation = null;
					g.color = 0xffffffff;
				}
			}
			if (Context.raw.tool == WorkspaceTool.ToolBrush  ||
				Context.raw.tool == WorkspaceTool.ToolEraser ||
				Context.raw.tool == WorkspaceTool.ToolClone  ||
				Context.raw.tool == WorkspaceTool.ToolBlur   ||
				Context.raw.tool == WorkspaceTool.ToolSmudge   ||
				Context.raw.tool == WorkspaceTool.ToolParticle ||
				(decalMask && !Config.raw.brush_3d) ||
				(decalMask && Context.in2dView())) {
				if (decalMask) {
					psize = Math.floor(cursorImg.width * (Context.raw.brushDecalMaskRadius * Context.raw.brushNodesRadius) * this.ui.SCALE());
				}
				if (Config.raw.brush_3d && Context.in2dView()) {
					psize = Math.floor(psize * UIView2D.inst.panScale);
				}
				g.drawScaledImage(cursorImg, mx - psize / 2, my - psize / 2, psize, psize);
			}
		}

		if (Context.raw.brushLazyRadius > 0 && !Context.raw.brushLocked &&
			(Context.raw.tool == WorkspaceTool.ToolBrush ||
			 Context.raw.tool == WorkspaceTool.ToolEraser ||
			 Context.raw.tool == WorkspaceTool.ToolDecal ||
			 Context.raw.tool == WorkspaceTool.ToolText ||
			 Context.raw.tool == WorkspaceTool.ToolClone ||
			 Context.raw.tool == WorkspaceTool.ToolBlur ||
			 Context.raw.tool == WorkspaceTool.ToolSmudge ||
			 Context.raw.tool == WorkspaceTool.ToolParticle)) {
			g.fillRect(mx - 1, my - 1, 2, 2);
			mx = Context.raw.brushLazyX * Base.w() + Base.x();
			my = Context.raw.brushLazyY * Base.h() + Base.y();
			let radius = Context.raw.brushLazyRadius * 180;
			g.color = 0xff666666;
			g.drawScaledImage(cursorImg, mx - radius / 2, my - radius / 2, radius, radius);
			g.color = 0xffffffff;
		}
	}
	///end

	showMaterialNodes = () => {
		// Clear input state as ui receives input events even when not drawn
		UINodes.inst.ui.endInput();

		///if (is_paint || is_sculpt)
		UINodes.inst.show = !UINodes.inst.show || UINodes.inst.canvasType != CanvasType.CanvasMaterial;
		UINodes.inst.canvasType = CanvasType.CanvasMaterial;
		///end
		///if is_lab
		UINodes.inst.show = !UINodes.inst.show;
		///end

		Base.resize();
	}

	///if (is_paint || is_sculpt)
	showBrushNodes = () => {
		// Clear input state as ui receives input events even when not drawn
		UINodes.inst.ui.endInput();
		UINodes.inst.show = !UINodes.inst.show || UINodes.inst.canvasType != CanvasType.CanvasBrush;
		UINodes.inst.canvasType = CanvasType.CanvasBrush;
		Base.resize();
	}
	///end

	show2DView = (type: View2DType) => {
		// Clear input state as ui receives input events even when not drawn
		UIView2D.inst.ui.endInput();
		if (UIView2D.inst.type != type) UIView2D.inst.show = true;
		else UIView2D.inst.show = !UIView2D.inst.show;
		UIView2D.inst.type = type;
		UIView2D.inst.hwnd.redraws = 2;
		Base.resize();
	}

	toggleBrowser = () => {
		let minimized = Config.raw.layout[LayoutSize.LayoutStatusH] <= (UIStatus.defaultStatusH * Config.raw.window_scale);
		Config.raw.layout[LayoutSize.LayoutStatusH] = minimized ? 240 : UIStatus.defaultStatusH;
		Config.raw.layout[LayoutSize.LayoutStatusH] = Math.floor(Config.raw.layout[LayoutSize.LayoutStatusH] * Config.raw.window_scale);
	}

	setIconScale = () => {
		if (this.ui.SCALE() > 1) {
			Res.load(["icons2x.k"], () => {
				Res.bundled.set("icons.k", Res.get("icons2x.k"));
			});
		}
		else {
			Res.load(["icons.k"], () => {});
		}
	}

	onBorderHover = (handle_ptr: i32, side: i32) => {
		if (!Base.uiEnabled) return;

		///if (is_paint || is_sculpt)
		if (handle_ptr != this.hwnds[TabArea.TabSidebar0].ptr &&
			handle_ptr != this.hwnds[TabArea.TabSidebar1].ptr &&
			handle_ptr != this.hwnds[TabArea.TabStatus].ptr &&
			handle_ptr != UINodes.inst.hwnd.ptr &&
			handle_ptr != UIView2D.inst.hwnd.ptr) return; // Scalable handles
		if (handle_ptr == UIView2D.inst.hwnd.ptr && side != BorderSide.SideLeft) return;
		if (handle_ptr == UINodes.inst.hwnd.ptr && side == BorderSide.SideTop && !UIView2D.inst.show) return;
		if (handle_ptr == this.hwnds[TabArea.TabSidebar0].ptr && side == BorderSide.SideTop) return;
		///end

		///if is_lab
		if (handle_ptr != this.hwnds[TabArea.TabStatus].ptr &&
			handle_ptr != UINodes.inst.hwnd.ptr &&
			handle_ptr != UIView2D.inst.hwnd.ptr) return; // Scalable handles
		if (handle_ptr == UIView2D.inst.hwnd.ptr && side != BorderSide.SideLeft) return;
		if (handle_ptr == UINodes.inst.hwnd.ptr && side == BorderSide.SideTop && !UIView2D.inst.show) return;
		///end

		if (handle_ptr == UINodes.inst.hwnd.ptr && side != BorderSide.SideLeft && side != BorderSide.SideTop) return;
		if (handle_ptr == this.hwnds[TabArea.TabStatus].ptr && side != BorderSide.SideTop) return;
		if (side == BorderSide.SideRight) return; // UI is snapped to the right side

		side == BorderSide.SideLeft || side == BorderSide.SideRight ?
			Krom.setMouseCursor(3) : // Horizontal
			Krom.setMouseCursor(4);  // Vertical

		if (Zui.current.inputStarted) {
			this.borderStarted = side;
			this.borderHandle_ptr = handle_ptr;
			Base.isResizing = true;
		}
	}

	onTextHover = () => {
		Krom.setMouseCursor(2); // I-cursor
	}

	onDeselectText = () => {
		///if krom_ios
		Input.getKeyboard().upListener(KeyCode.Shift);
		///end
	}

	onTabDrop = (to_ptr: i32, toPosition: i32, from_ptr: i32, fromPosition: i32) => {
		let i = -1;
		let j = -1;
		for (let k = 0; k < this.htabs.length; ++k) {
			if (this.htabs[k].ptr == to_ptr) i = k;
			if (this.htabs[k].ptr == from_ptr) j = k;
		}
		if (i > -1 && j > -1) {
			let element = this.hwndTabs[j][fromPosition];
			this.hwndTabs[j].splice(fromPosition, 1);
			this.hwndTabs[i].splice(toPosition, 0, element);
			this.hwnds[i].redraws = 2;
			this.hwnds[j].redraws = 2;
		}
	}

	tagUIRedraw = () => {
		UIHeader.inst.headerHandle.redraws = 2;
		this.hwnds[TabArea.TabStatus].redraws = 2;
		UIMenubar.inst.workspaceHandle.redraws = 2;
		UIMenubar.inst.menuHandle.redraws = 2;
		///if (is_paint || is_sculpt)
		this.hwnds[TabArea.TabSidebar0].redraws = 2;
		this.hwnds[TabArea.TabSidebar1].redraws = 2;
		UIToolbar.inst.toolbarHandle.redraws = 2;
		///end
	}
}
