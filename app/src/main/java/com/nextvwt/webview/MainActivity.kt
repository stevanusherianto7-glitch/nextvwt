package com.nextvwt.webview

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var errorLayout: LinearLayout
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    private val PREFS_NAME = "NexVWTPrefs"
    private val KEY_SERVER_URL = "server_url"
    private val DEFAULT_URL = "file:///android_asset/www/index.html"

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.entries.all { it.value }) {
            loadServerUrl()
        } else {
            Toast.makeText(this, "Permissions required", Toast.LENGTH_LONG).show()
        }
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val results = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            fileChooserCallback?.onReceiveValue(results)
        } else {
            fileChooserCallback?.onReceiveValue(null)
        }
        fileChooserCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        errorLayout = findViewById(R.id.errorLayout)
        val btnSetServer: Button = findViewById(R.id.btnSetServer)
        val btnReload: Button = findViewById(R.id.btnReload)

        setupWebView()
        
        btnSetServer.setOnClickListener { showSetServerDialog() }
        btnReload.setOnClickListener { 
            errorLayout.visibility = View.GONE
            webView.visibility = View.VISIBLE
            webView.loadUrl("file:///android_asset/www/index.html?server=" + Uri.encode(getServerUrl())) 
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        checkPermissionsAndLoad()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request?.isForMainFrame == true) {
                    // Paksa munculkan error layout kustom kita
                    webView.visibility = View.GONE
                    errorLayout.visibility = View.VISIBLE
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                // Jangan sembunyikan errorLayout jika URL yang dimuat adalah error page bawaan
                if (webView.visibility == View.VISIBLE) {
                    errorLayout.visibility = View.GONE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    val hasAudio = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    val hasCamera = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                    
                    if (hasAudio && hasCamera) {
                        request?.grant(request.resources)
                    } else {
                        request?.deny()
                    }
                }
            }

            override fun onShowFileChooser(w: WebView?, f: ValueCallback<Array<Uri>>?, p: FileChooserParams?): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = f
                try {
                    fileChooserLauncher.launch(p?.createIntent())
                } catch (e: Exception) {
                    fileChooserCallback = null
                    return false
                }
                return true
            }
        }
    }

    private fun checkPermissionsAndLoad() {
        val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        val toRequest = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (toRequest.isEmpty()) loadServerUrl() 
        else requestPermissionLauncher.launch(toRequest.toTypedArray())
    }

    private fun loadServerUrl() {
        startVwtForegroundService()
        webView.loadUrl("file:///android_asset/www/index.html?server=" + Uri.encode(getServerUrl()))
    }

    private fun startVwtForegroundService() {
        val serviceIntent = Intent(this, ForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun getServerUrl(): String {
        return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_SERVER_URL, DEFAULT_URL) ?: DEFAULT_URL
    }

    private fun showSetServerDialog() {
        val input = EditText(this)
        input.setText(getServerUrl())
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(50, 20, 50, 20)
            addView(input)
        }

        AlertDialog.Builder(this)
            .setTitle("Set Server URL")
            .setView(container)
            .setPositiveButton("Simpan") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putString(KEY_SERVER_URL, newUrl).apply()
                    errorLayout.visibility = View.GONE
                    webView.visibility = View.VISIBLE
                    webView.loadUrl("file:///android_asset/www/index.html?server=" + Uri.encode(newUrl))
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    inner class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun showSetServerDialog() {
            runOnUiThread {
                this@MainActivity.showSetServerDialog()
            }
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
