using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class MaxpWinTracker {
    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetWindowTextW(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    static void Main(string[] args) {
        Console.OutputEncoding = new UTF8Encoding(false);
        bool once = false;
        int parentPid = 0;

        for (int i = 0; i < args.Length; i++) {
            if (args[i] == "--once") {
                once = true;
            } else if (args[i] == "--parent" && i + 1 < args.Length) {
                int.TryParse(args[i + 1], out parentPid);
            }
        }

        IntPtr lastHwnd = IntPtr.Zero;
        string lastTitle = "";
        int tick = 0;

        do {
            // Self-termination safety: If parent process (Electron) exited, terminate tracker
            if (parentPid > 0) {
                try {
                    var parent = Process.GetProcessById(parentPid);
                    if (parent.HasExited) break;
                } catch {
                    break;
                }
            }

            try {
                IntPtr hwnd = GetForegroundWindow();
                if (hwnd != IntPtr.Zero) {
                    StringBuilder sb = new StringBuilder(1024);
                    GetWindowTextW(hwnd, sb, 1024);
                    string title = sb.ToString();

                    uint pid = 0;
                    GetWindowThreadProcessId(hwnd, out pid);

                    string procName = "";
                    string exePath = "";

                    if (pid > 0) {
                        try {
                            using (var p = Process.GetProcessById((int)pid)) {
                                procName = p.ProcessName;
                                try { exePath = p.MainModule.FileName; } catch {}
                            }
                        } catch {}
                    }

                    // Emit on change, or periodically every 15 seconds (tick % 6 == 0), or if --once
                    if (hwnd != lastHwnd || title != lastTitle || tick % 6 == 0 || once) {
                        lastHwnd = hwnd;
                        lastTitle = title;

                        string json = "{\"title\":\"" + EscapeJson(title) +
                                      "\",\"owner\":{\"name\":\"" + EscapeJson(procName) +
                                      "\",\"processId\":" + pid +
                                      ",\"exePath\":\"" + EscapeJson(exePath) + "\"}}";
                        Console.WriteLine(json);
                        Console.Out.Flush();
                    }
                }
            } catch {}

            if (once) break;
            tick++;
            Thread.Sleep(2500);
        } while (true);
    }

    static string EscapeJson(string s) {
        if (string.IsNullOrEmpty(s)) return "";
        StringBuilder sb = new StringBuilder(s.Length + 10);
        foreach (char c in s) {
            switch (c) {
                case '\\': sb.Append("\\\\"); break;
                case '\"': sb.Append("\\\""); break;
                case '\r': sb.Append("\\r"); break;
                case '\n': sb.Append("\\n"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (c < 32) sb.AppendFormat("\\u{0:x4}", (int)c);
                    else sb.Append(c);
                    break;
            }
        }
        return sb.ToString();
    }
}
