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
                await webView.EnsureCoreWebView2Async();
                webView.CoreWebView2.Settings.AreDevToolsEnabled = false;

                // 1. Always prioritize extracting and running our own embedded bundle.zip
                var appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OmniPdfStudio", "web");
                var indexPath = Path.Combine(appDataDir, "index.html");

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

                // 2. Only if no embedded bundle is present (e.g., local developer debug build), check parent repo
                if (!File.Exists(indexPath))
                {
                    var devIndex = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "index.html"));
                    if (File.Exists(devIndex))
                    {
                        indexPath = devIndex;
                    }
                }

                if (File.Exists(indexPath))
                {
                    webView.Source = new Uri(indexPath);
                }
                else
                {
                    MessageBox.Show($"OmniPDF Studio interface could not be loaded at {indexPath}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };

            Application.Run(form);
        }
    }
}
