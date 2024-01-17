
class MakeClone {

	static run = (vert: NodeShader, frag: NodeShader) => {
		frag.add_uniform('vec2 cloneDelta', '_cloneDelta');
		///if (krom_direct3d11 || krom_direct3d12 || krom_metal || krom_vulkan)
		frag.write('vec2 texCoordInp = texelFetch(gbuffer2, ivec2((sp.xy + cloneDelta) * gbufferSize), 0).ba;');
		///else
		frag.write('vec2 texCoordInp = texelFetch(gbuffer2, ivec2((sp.x + cloneDelta.x) * gbufferSize.x, (1.0 - (sp.y + cloneDelta.y)) * gbufferSize.y), 0).ba;');
		///end

		frag.write('vec3 texpaint_pack_sample = textureLod(texpaint_pack_undo, texCoordInp, 0.0).rgb;');
		let base = 'textureLod(texpaint_undo, texCoordInp, 0.0).rgb';
		let rough = 'texpaint_pack_sample.g';
		let met = 'texpaint_pack_sample.b';
		let occ = 'texpaint_pack_sample.r';
		let nortan = 'textureLod(texpaint_nor_undo, texCoordInp, 0.0).rgb';
		let height = '0.0';
		let opac = '1.0';
		frag.write(`vec3 basecol = ${base};`);
		frag.write(`float roughness = ${rough};`);
		frag.write(`float metallic = ${met};`);
		frag.write(`float occlusion = ${occ};`);
		frag.write(`vec3 nortan = ${nortan};`);
		frag.write(`float height = ${height};`);
		frag.write(`float mat_opacity = ${opac};`);
		frag.write('float opacity = mat_opacity * brushOpacity;');
		if (Context.raw.material.paintEmis) {
			frag.write('float emis = 0.0;');
		}
		if (Context.raw.material.paintSubs) {
			frag.write('float subs = 0.0;');
		}
	}
}
