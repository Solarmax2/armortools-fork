package arm;

import iron.ArmPack;
import iron.System;
import iron.Data;

@:keep
class Plugin {

	public static var plugins: Map<String, Plugin> = [];
	static var pluginName: String;

	public var drawUI: zui.Zui->Void = null;
	public var draw: Void->Void = null;
	public var update: Void->Void = null;
	public var delete: Void->Void = null;
	public var version = "0.1";
	public var apiversion = "0.1";
	var name: String;

	public function new() {
		name = pluginName;
		plugins.set(name, this);
	}

	public static function init() {
		var api = js.Syntax.code("arm");
		#if (is_paint || is_sculpt)
		api.MaterialParser = arm.shader.MaterialParser;
		api.NodesMaterial = arm.shader.NodesMaterial;
		api.UIView2D = arm.ui.UIView2D;
		api.RenderUtil = arm.util.RenderUtil;
		#end
		#if is_paint
		api.UVUtil = arm.util.UVUtil;
		#end
		#if is_lab
		api.BrushOutputNode = arm.logic.BrushOutputNode;
		#end
	}

	public static function start(plugin: String) {
		try {
			Data.getBlob("plugins/" + plugin, function(blob: js.lib.ArrayBuffer) {
				pluginName = plugin;
				// js.Syntax.code("(1, eval)({0})", System.bufferToString(blob)); // Global scope
				js.Syntax.code("eval({0})", System.bufferToString(blob)); // Local scope
				Data.deleteBlob("plugins/" + plugin);
			});
		}
		catch (e: Dynamic) {
			Console.error(tr("Failed to load plugin") + " '" + plugin + "'");
			Krom.log(e);
		}
	}

	public static function stop(plugin: String) {
		var p = plugins.get(plugin);
		if (p != null && p.delete != null) p.delete();
		plugins.remove(plugin);
	}
}

@:keep
class Keep {
	public static function keep() {
		return untyped [
			ArmPack.decode,
			ArmPack.encode,
			arm.ui.UIBox.showMessage
		];
	}
}

#if is_lab
@:keep
class KeepLab {
	public static function keep() {
		var a = Base.uiBox.panel;
		return [a];
	}
}
#end

@:expose("core")
class CoreBridge {
	public static var Json = haxe.Json;
	public static var Image = Image;
	public static var System = System;
	public static function colorFromFloats(r: Float, g: Float, b: Float, a: Float): Color {
		return Color.fromFloats(r, g, b, a);
	}
}

@:expose("iron")
class IronBridge {
	public static var App = iron.App;
	public static var Scene = iron.Scene;
	public static var RenderPath = iron.RenderPath;
	public static var Time = iron.Time;
	public static var Input = iron.Input;
	public static var ArmPack = iron.ArmPack;
	public static var Object = iron.Object;
	public static var Data = iron.Data;
}

@:expose("zui")
class ZuiBridge {
	public static var Handle = zui.Zui.Handle;
	public static var Zui = zui.Zui;
}

@:expose("console")
class ConsoleBridge {
	public static var log = arm.Console.log;
	public static var error = arm.Console.error;
}

@:expose("arm")
class ArmBridge {
	public static var Base = arm.Base;
	public static var Config = arm.Config;
	public static var Context = arm.Context;
	public static var History = arm.History;
	public static var Operator = arm.Operator;
	public static var Plugin = arm.Plugin;
	public static var Project = arm.Project;
	public static var Res = arm.Res;
	public static var Path = arm.sys.Path;
	public static var File = arm.sys.File;
	public static var NodesBrush = arm.logic.NodesBrush;
	public static var LogicParser = arm.logic.LogicParser;
	public static var UIBase = arm.ui.UIBase;
	public static var UINodes = arm.ui.UINodes;
	public static var UIFiles = arm.ui.UIFiles;
	public static var UIMenu = arm.ui.UIMenu;
	public static var UIBox = arm.ui.UIBox;
	public static var MeshUtil = arm.util.MeshUtil;
	public static var Viewport = arm.Viewport;
	#if (krom_direct3d12 || krom_vulkan || krom_metal)
	public static var RenderPathRaytrace = arm.render.RenderPathRaytrace;
	#end
}
