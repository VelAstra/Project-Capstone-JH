using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;

namespace OmniPdfStudio
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            ApplicationConfiguration.Initialize();
            
            var form = new Form
            {
                Text = "OmniPDF Studio",
                Width = 1280,
                Height = 850,
                MinimumSize = new System.Drawing.Size(960, 650),
                StartPosition = FormStartPosition.CenterScreen
            };

            var iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
            if (File.Exists(iconPath))
            {
                form.Icon = new System.Drawing.Icon(iconPath);
            }
            else
            {
                var parentIcon = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "icon.ico");
                if (File.Exists(parentIcon)) form.Icon = new System.Drawing.Icon(parentIcon);
            }

            // Hardware and memory optimization flags for WebView2 Chromium runtime
            Environment.SetEnvironmentVariable("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
                "--js-flags=\"--max-old-space-size=256 --optimize-for-size\" --disable-features=Autofill,Translate,MediaRouter,OptimizationHints --disk-cache-size=16777216 --disable-component-update --disable-sync");

            var webView = new WebView2
            {
                Dock = DockStyle.Fill
            };

            form.Controls.Add(webView);

            // Dynamically manage memory when minimized/restored
            form.Resize += (s, e) =>
            {
                try
                {
                    if (webView?.CoreWebView2 != null)
                    {
                        if (form.WindowState == FormWindowState.Minimized)
                        {
                            webView.CoreWebView2.MemoryUsageTargetLevel = Microsoft.Web.WebView2.Core.CoreWebView2MemoryUsageTargetLevel.Low;
                        }
                        else
                        {
                            webView.CoreWebView2.MemoryUsageTargetLevel = Microsoft.Web.WebView2.Core.CoreWebView2MemoryUsageTargetLevel.Normal;
                        }
                    }
                }
                catch { }
            };

            form.Load += async (s, e) =>
            {
                var omniDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OmniPdfStudio");
                var appDataDir = Path.Combine(omniDir, "web");
                var userDataDir = Path.Combine(omniDir, "webview_profile");

                // 1. Cleanly extract embedded bundle.zip to appDataDir
                try
                {
                    var assembly = Assembly.GetExecutingAssembly();
                    var resName = Array.Find(assembly.GetManifestResourceNames(), r => r.EndsWith("bundle.zip", StringComparison.OrdinalIgnoreCase));
                    using var resourceStream = !string.IsNullOrEmpty(resName) ? assembly.GetManifestResourceStream(resName) : null;

                    if (resourceStream != null)
                    {
                        Directory.CreateDirectory(appDataDir);
                        using var archive = new ZipArchive(resourceStream);
                        foreach (var entry in archive.Entries)
                        {
                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(Path.Combine(appDataDir, entry.FullName));
                                continue;
                            }
                            var destPath = Path.Combine(appDataDir, entry.FullName);
                            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
                            entry.ExtractToFile(destPath, overwrite: true);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Resource extraction note: " + ex.Message);
                }

                // 2. Initialize isolated WebView2 Environment (prevents saving cache/profile next to executable or in Downloads)
                Directory.CreateDirectory(userDataDir);
                var webViewEnv = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, userDataDir);
                await webView.EnsureCoreWebView2Async(webViewEnv);
                webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                // 3. Bind virtual host mapping directly to appDataDir (guarantees HTTPS origin and prevents cross-file bleed)
                var indexPath = Path.Combine(appDataDir, "index.html");
                if (File.Exists(indexPath))
                {
                    webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        "omnipdf.local",
                        appDataDir,
                        Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow
                    );
                    webView.Source = new Uri("https://omnipdf.local/index.html");
                }
                else
                {
                    // Fallback for debug/development runs directly in repo folder
                    var devIndex = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "index.html"));
                    if (File.Exists(devIndex))
                    {
                        var devDir = Path.GetDirectoryName(devIndex)!;
                        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                            "omnipdf.local",
                            devDir,
                            Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow
                        );
                        webView.Source = new Uri("https://omnipdf.local/index.html");
                    }
                    else
                    {
                        MessageBox.Show("OmniPDF Studio interface bundle could not be found. Please reinstall the application.", "OmniPDF Studio Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            };

            Application.Run(form);
        }
    }
}
