const imageInput = document.getElementById('imageInput');
const imageComparison = document.getElementById('imageComparison');
const slider = document.getElementById('slider');
const enhanceBtn = document.getElementById('enhanceBtn');
const downloadBtn = document.getElementById('downloadBtn');
let originalImage = null;
let enhancedImage = null;
let isDragging = false;

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        alert('Lütfen bir resim dosyası seçin!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        originalImage = new Image();
        originalImage.src = e.target.result;
        originalImage.onload = function () {
            imageComparison.innerHTML = ''; // Alanı sıfırla
            imageComparison.style.display = 'block';

            const img = createImageElement(originalImage.src, false);
            enhancedImage = createImageElement(originalImage.src, true);
            imageComparison.appendChild(img);
            imageComparison.appendChild(enhancedImage);
            imageComparison.appendChild(slider);

            fadeIn(img); // Orijinal görüntüyü fade-in yap
        };
    };

    reader.readAsDataURL(file);
});

enhanceBtn.addEventListener('click', () => {
    if (!originalImage) {
        alert('Lütfen önce bir resim yükleyin!');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    ctx.drawImage(originalImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Görüntü işleme
    const adjustedData = adjustImageProperties(imageData, 1.2, 0.2, { red: 1.1, green: 1.1, blue: 1.1 });

    ctx.putImageData(adjustedData, 0, 0);

    // Çözünürlük artırma
    const upscaleCanvas = document.createElement('canvas');
    const upscaleCtx = upscaleCanvas.getContext('2d');
    upscaleCanvas.width = canvas.width * 1.5; // %50 çözünürlük artışı
    upscaleCanvas.height = canvas.height * 1.5;
    upscaleCtx.drawImage(canvas, 0, 0, upscaleCanvas.width, upscaleCanvas.height);

    const enhancedImageURL = upscaleCanvas.toDataURL();

    enhancedImage.src = enhancedImageURL;

    fadeIn(enhancedImage, () => {
        downloadBtn.href = enhancedImageURL;
        downloadBtn.style.display = 'inline-block'; // İndir butonunu göster
    });
});

// Görsel oluşturma fonksiyonu
function createImageElement(src, isEnhanced) {
    const img = new Image();
    img.src = src;
    img.classList.add(isEnhanced ? 'enhanced' : 'original');
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.opacity = '0';
    img.style.transition = 'opacity 1s ease';
    return img;
}

// Görsel işleme fonksiyonu (Parlaklık, kontrast, doygunluk)
function adjustImageProperties(imageData, contrast, brightness, saturation) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Parlaklık ve kontrast
        r = r * contrast + brightness;
        g = g * contrast + brightness;
        b = b * contrast + brightness;

        // Renk kanallarının doygunluğu
        r = Math.min(255, r * saturation.red);
        g = Math.min(255, g * saturation.green);
        b = Math.min(255, b * saturation.blue);

        // Renkleri sınırla
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
    }

    return imageData;
}

// Fade-in animasyonu
function fadeIn(element, callback) {
    element.style.opacity = '0';
    requestAnimationFrame(() => {
        element.style.opacity = '1';
        if (callback) {
            setTimeout(callback, 1000);
        }
    });
}

// Slider fonksiyonları
slider.addEventListener('mousedown', () => isDragging = true);
window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('mousemove', (event) => dragSlider(event));

slider.addEventListener('touchstart', () => isDragging = true);
window.addEventListener('touchend', () => isDragging = false);
window.addEventListener('touchmove', (event) => dragSlider(event));

function dragSlider(event) {
    if (!isDragging) return;

    const rect = imageComparison.getBoundingClientRect();
    const clientX = event.clientX || event.touches[0].clientX;
    let offsetX = clientX - rect.left;
    offsetX = Math.max(0, Math.min(offsetX, rect.width));

    slider.style.left = `${offsetX}px`;
    enhancedImage.style.clipPath = `inset(0 ${rect.width - offsetX}px 0 0)`;
}

// Yüksek frekanslı keskinleştirme (High-pass sharpening)
function highPassSharpen(ctx, canvas) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const sharpenMatrix = [
        [-1, -1, -1],
        [-1,  9, -1],
        [-1, -1, -1]
    ];

    // Piksel üzerinde konvolüsyonel işlem uygulayarak keskinleştirme
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            let r = 0, g = 0, b = 0;

            // 3x3 matris etrafında gezerek piksel değerlerini hesapla
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = (y + ky) * canvas.width + (x + kx);
                    r += data[px * 4] * sharpenMatrix[ky + 1][kx + 1];
                    g += data[px * 4 + 1] * sharpenMatrix[ky + 1][kx + 1];
                    b += data[px * 4 + 2] * sharpenMatrix[ky + 1][kx + 1];
                }
            }

            const index = (y * canvas.width + x) * 4;
            data[index] = Math.min(255, Math.max(0, r));   // Red
            data[index + 1] = Math.min(255, Math.max(0, g)); // Green
            data[index + 2] = Math.min(255, Math.max(0, b)); // Blue
        }
    }

    // Keskinleştirilmiş görüntüyü canvas'a geri yaz
    ctx.putImageData(imageData, 0, 0);
}

// Parlaklık ve ışık efektlerini uygulama
function applyLightingEffects(ctx, canvas) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Işık kaynağını simüle etmek için basit bir yaklaşım kullanıyoruz
    const lightSource = { x: canvas.width / 2, y: canvas.height / 2 }; // Işık kaynağı merkezde

    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % canvas.width; // Pikselin x koordinatı
        const y = Math.floor(i / 4 / canvas.width); // Pikselin y koordinatı

        const r = data[i];     // Red
        const g = data[i + 1]; // Green
        const b = data[i + 2]; // Blue

        // Siyah, beyaz ve gri tonlarını koruma
        if (isCloseToBlack(r, g, b) || isCloseToWhite(r, g, b) || isCloseToGray(r, g, b)) {
            continue;
        }

        // Işık kaynağına göre mesafe hesaplama (basit bir mesafe hesaplaması)
        const distance = Math.sqrt(Math.pow(x - lightSource.x, 2) + Math.pow(y - lightSource.y, 2));

        // Işık kaynağından uzaklık arttıkça parlaklık azalır
        const brightnessFactor = Math.max(1 - distance / (canvas.width / 2), 0); // Işığa yakın yerler daha parlak

        // Parlaklık ve ışık efektlerini uygulama
        data[i] = Math.min(255, r * (1 + brightnessFactor));     // Red
        data[i + 1] = Math.min(255, g * (1 + brightnessFactor)); // Green
        data[i + 2] = Math.min(255, b * (1 + brightnessFactor)); // Blue
    }

    // Işık ve parlaklık efektlerini görsele uygula
    ctx.putImageData(imageData, 0, 0);
}

// Siyah renge yakınlık kontrolü
function isCloseToBlack(r, g, b) {
    return (r < 50 && g < 50 && b < 50);  // Siyah rengi için eşiği ayarladık
}

// Beyaz renge yakınlık kontrolü
function isCloseToWhite(r, g, b) {
    return (r > 205 && g > 205 && b > 205);  // Beyaz rengi için eşiği ayarladık
}

// Gri tonlarına yakınlık kontrolü (R, G, B birbirine yakın olmalı)
function isCloseToGray(r, g, b) {
    const threshold = 20; // Gri tonları için eşik değeri
    return Math.abs(r - g) < threshold && Math.abs(g - b) < threshold && Math.abs(r - b) < threshold;
}
