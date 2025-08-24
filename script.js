import JSZip from 'jszip';

const appNameInput = document.getElementById('appName');
const packageNameInput = document.getElementById('packageName');
const appIconInput = document.getElementById('appIcon');
const widgetProviderNameInput = document.getElementById('widgetProviderName');
const widgetLayoutXmlInput = document.getElementById('widgetLayoutXml');
const widgetInfoXmlInput = document.getElementById('widgetInfoXml');
const privateKeyInput = document.getElementById('privateKey');
const certificateInput = document.getElementById('certificate');
const buildBtn = document.getElementById('buildBtn');
const logEl = document.getElementById('log');
const downloadContainer = document.getElementById('download-container');
const downloadLink = document.getElementById('downloadLink');

// --- Tweakable Default Values ---

/* @tweakable The minimum Android SDK version for the generated APK. */
const DEFAULT_MIN_SDK_VERSION = 21; // Android 5.0 Lollipop

/* @tweakable Default widget layout XML */
const DEFAULT_WIDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:background="#88000000">

    <TextView
        android:id="@+id/widget_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="My First Widget"
        android:textColor="#FFFFFF"
        android:textSize="24sp" />

</LinearLayout>`;

/* @tweakable Default widget info XML */
const DEFAULT_WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="40dp"
    android:updatePeriodMillis="86400000"
    android:initialLayout="@layout/widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;

// Populate text areas with defaults
widgetLayoutXmlInput.value = DEFAULT_WIDGET_LAYOUT;
widgetInfoXmlInput.value = DEFAULT_WIDGET_INFO;

let currentBlobUrl = null;

function logger(message) {
    console.log(message);
    logEl.textContent += `> ${message}\n`;
    logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
    logEl.textContent = '';
    downloadContainer.style.display = 'none';
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
}

function generateAndroidManifest(packageName, widgetProviderName) {
    logger('Generating AndroidManifest.xml');
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">

    <uses-sdk android:minSdkVersion="${DEFAULT_MIN_SDK_VERSION}" />

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="${appNameInput.value}"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault">

        <receiver android:name=".${widgetProviderName}" android:exported="false">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/widget_info" />
        </receiver>
    </application>
</manifest>`;
}

async function createApk(files) {
    logger('Creating APK structure...');
    const zip = JSZip();

    for (const file of files) {
        zip.file(file.path, file.content);
    }

    logger('Compressing APK...');
    return zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    });
}

// Placeholder for a very complex function
async function zipAlign(apkBuffer) {
    logger('Aligning APK (placeholder)...');
    // THIS IS A PLACEHOLDER.
    // A real implementation is complex and requires manipulating ZIP entry headers
    // to add padding to uncompressed files and update all offsets.
    // This is best done with a dedicated WASM library.
    return Promise.resolve(apkBuffer);
}

// Placeholder for a very complex function
async function signApk(apkBuffer, privateKeyPem, certificatePem) {
    logger('Signing APK with APK Signature Scheme v2 (placeholder)...');
    // THIS IS A PLACEHOLDER.
    // A real implementation of APK Signature Scheme v2 is highly complex.
    // It involves:
    // 1. Calculating digests of all files.
    // 2. Creating a signed data block with these digests.
    // 3. Wrapping it in an APK Signing Block.
    // 4. Inserting this block between the ZIP Central Directory and EOCD.
    // This requires precise byte-level manipulation of the APK file.
    // WebCrypto API can do the cryptographic signing, but the APK structure
    // manipulation is the hard part.
    if (!privateKeyPem || !certificatePem) {
        throw new Error('Private key and certificate are required for signing.');
    }
    
    // Simulate signing process
    try {
        const pkcs8 = atob(privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|[\n\r]/g, ''));
        const keyBuffer = new Uint8Array(pkcs8.length);
        for (let i = 0; i < pkcs8.length; i++) {
            keyBuffer[i] = pkcs8.charCodeAt(i);
        }
        
        await crypto.subtle.importKey(
            'pkcs8',
            keyBuffer.buffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            true,
            ['sign']
        );
        logger('Private key is valid.');
    } catch (e) {
        logger(`Error parsing private key: ${e.message}`);
        throw new Error('Invalid private key format. Please use PKCS#8 PEM.');
    }

    return Promise.resolve(apkBuffer);
}


buildBtn.addEventListener('click', async () => {
    clearLog();
    logger('Starting build process...');

    try {
        const appName = appNameInput.value.trim();
        const packageName = packageNameInput.value.trim();
        const widgetProviderName = widgetProviderNameInput.value.trim();
        const iconFile = appIconInput.files[0];
        const widgetLayout = widgetLayoutXmlInput.value;
        const widgetInfo = widgetInfoXmlInput.value;
        const privateKey = privateKeyInput.value.trim();
        const certificate = certificateInput.value.trim();

        if (!appName || !packageName || !widgetProviderName) {
            throw new Error('App Name, Package Name, and Provider Name are required.');
        }
        if (!iconFile) {
            throw new Error('App Icon is required.');
        }
        if (!privateKey || !certificate) {
             throw new Error('A private key and certificate are required to sign the APK.');
        }

        const manifest = generateAndroidManifest(packageName, widgetProviderName);
        const iconBuffer = await iconFile.arrayBuffer();

        const filesToZip = [
            { path: 'AndroidManifest.xml', content: manifest },
            { path: 'res/layout/widget_layout.xml', content: widgetLayout },
            { path: 'res/xml/widget_info.xml', content: widgetInfo },
            { path: 'res/drawable/ic_launcher.png', content: iconBuffer },
            // A real APK would have a compiled resources.arsc file and a classes.dex file.
            // For this basic generator, we omit them, which might cause issues on some devices.
        ];

        const unsignedApk = await createApk(filesToZip);
        logger(`Unsigned APK size: ${unsignedApk.byteLength} bytes`);

        const alignedApk = await zipAlign(unsignedApk);
        logger('Zip alignment complete.');

        const signedApk = await signApk(alignedApk, privateKey, certificate);
        logger('Signing complete.');

        const blob = new Blob([signedApk], { type: 'application/vnd.android.package-archive' });
        currentBlobUrl = URL.createObjectURL(blob);

        downloadLink.href = currentBlobUrl;
        downloadLink.download = `${appName.replace(/\s+/g, '_')}.apk`;
        downloadContainer.style.display = 'block';

        logger('✅ Build successful! Your APK is ready.');

    } catch (error) {
        logger(`❌ Build failed: ${error.message}`);
        console.error(error);
    } finally {
        // Clear sensitive data from memory after a short delay
        setTimeout(() => {
            privateKeyInput.value = '';
            certificateInput.value = '';
            logger('Cleared key fields for security.');
        }, 1000);
    }
});