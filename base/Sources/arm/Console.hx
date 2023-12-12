package arm;

import iron.System;
import arm.Base;

@:keep
class Console {

	public static var message = "";
	public static var messageTimer = 0.0;
	public static var messageColor = 0x00000000;
	public static var lastTraces: Array<String> = [""];
	static var progressText: String = null;

	static function drawToast(s: String, g: Graphics2) {
		g.color = 0x55000000;
		g.fillRect(0, 0, System.width, System.height);
		var scale = Base.getUIs()[0].SCALE();
		var x = System.width / 2;
		var y = System.height - 200 * scale;
		g.fillRect(x - 200 * scale, y, 400 * scale, 80 * scale);
		g.font = Base.font;
		g.fontSize = Std.int(22 * scale);
		g.color = 0xffffffff;
		g.drawString(s, x - g.font.width(g.fontSize, s) / 2, y + 40 * scale - g.font.height(g.fontSize) / 2);
	}

	public static function toast(s: String, g2: Graphics2 = null) {
		// Show a popup message
		function _render(g: Graphics2) {
			drawToast(s, g);
			if (g2 == null) {
				Base.notifyOnNextFrame(function() {
					iron.App.removeRender2D(_render);
				});
			}
		}
		g2 != null ? _render(g2) : iron.App.notifyOnRender2D(_render);
		consoleTrace(s);
	}

	static function drawProgress(g: Graphics2) {
		drawToast(progressText, g);
	}

	public static function progress(s: String) {
		// Keep popup message displayed until s == null
		if (s == null) {
			iron.App.removeRender2D(drawProgress);
		}
		else if (progressText == null) {
			iron.App.notifyOnRender2D(drawProgress);
		}
		if (s != null) consoleTrace(s);
		progressText = s;
	}

	public static function info(s: String) {
		messageTimer = 5.0;
		message = s;
		messageColor = 0x00000000;
		Base.redrawStatus();
		consoleTrace(s);
	}

	public static function error(s: String) {
		messageTimer = 8.0;
		message = s;
		messageColor = 0xffaa0000;
		Base.redrawStatus();
		consoleTrace(s);
	}

	public static function log(s: String) {
		consoleTrace(s);
	}

	static function consoleTrace(v: Dynamic) {
		Base.redrawConsole();
		lastTraces.unshift(Std.string(v));
		if (lastTraces.length > 100) lastTraces.pop();
	}
}
