// LocalStorage'dan mevcut vizyonları çek veya boş dizi oluştur
let visions = JSON.parse(localStorage.getItem('zen_visions_v3')) || [];
let currentViewingId = null;
let editingId = null; 
let currentAudioLink = "";

// Sayfa yüklendiğinde kartları ekrana çiz
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
});

// ARAYÜZ (KARTLARI ÇİZME) İŞLEMİ
function renderDashboard() {
    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = '';

    if (visions.length === 0) {
        grid.innerHTML = '<div class="empty-state">Henüz bir vizyon eklenmedi. Gözlerini kapat, geleceği hayal et ve yeni bir atmosfer yarat.</div>';
        return;
    }

    // Yeni eklenen en üstte görünsün diye ters çeviriyoruz
    const reversedVisions = Array.from(visions).reverse();
    
    reversedVisions.forEach(v => {
        const card = document.createElement('div');
        card.className = 'magazine-card';
        card.onclick = () => openView(v.id);
        
        let coverImg = 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?q=80&w=800&auto=format&fit=crop';
        if (v.images && v.images.length > 0) coverImg = v.images[0];

        card.innerHTML = `
            <img src="${coverImg}" class="card-img" alt="Kapak Görseli">
            <div class="card-content">
                <div class="card-title">${v.title || 'İsimsiz Vizyon'}</div>
                <div class="card-meta">${v.location || 'Bilinmeyen Mekan'}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// DUYGU (TAG) SEÇİM VE EKLEME KONTROLLERİ
function toggleTag(element) {
    element.classList.toggle('selected');
}

function addCustomEmotion() {
    const input = document.getElementById('custom-emotion-input');
    const val = input.value.trim();
    if (val) {
        const newTag = document.createElement('div');
        newTag.className = 'emotion-tag selected';
        newTag.textContent = val;
        newTag.onclick = function() { toggleTag(this); };
        
        const container = document.getElementById('pre-emotions-container');
        container.insertBefore(newTag, document.querySelector('.custom-emotion'));
        input.value = '';
    }
}

// FORM ALANI GÖRSEL/LİNK DİNAMİK EKLEME
function addImageField(val = "") {
    const container = document.getElementById('image-container');
    const div = document.createElement('div');
    div.className = 'media-item';
    div.innerHTML = `
        <input type="file" accept="image/*" class="img-file" style="flex:1;">
        <span style="font-size:0.8rem; color:var(--text-muted);">VEYA</span>
        <input type="text" class="img-url" placeholder="Görsel Linki" value="${val}" style="flex:2;">
        <button type="button" class="btn" style="padding:0.3rem 0.6rem; font-size:1rem;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function addUrlField(val = "") {
    const container = document.getElementById('link-container');
    const div = document.createElement('div');
    div.className = 'media-item';
    div.innerHTML = `
        <input type="text" class="ext-url" placeholder="Örn: https://pinterest.com/..." value="${val}" style="flex:1;">
        <button type="button" class="btn" style="padding:0.3rem 0.6rem; font-size:1rem;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// KAYDETME VEYA GÜNCELLEME İŞLEMİ
document.getElementById('vision-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const imageItems = Array.from(document.querySelectorAll('#image-container .media-item'));
    let processedImages = [];
    
    for (let item of imageItems) {
        const fileInput = item.querySelector('.img-file').files[0];
        const urlInput = item.querySelector('.img-url').value.trim();
        
        if (fileInput) {
            try {
                const base64 = await fileToBase64(fileInput);
                processedImages.push(base64);
            } catch(err) { console.error("Fotoğraf dönüştürme hatası:", err); }
        } else if (urlInput) {
            processedImages.push(urlInput);
        }
    }

    const linkItems = Array.from(document.querySelectorAll('#link-container .ext-url'));
    let processedLinks = [];
    linkItems.forEach(input => {
        if(input.value.trim()) processedLinks.push(input.value.trim());
    });

    const tags = Array.from(document.querySelectorAll('.emotion-tag.selected'));
    const preEmotions = tags.map(t => t.textContent);

    const visionData = {
        id: editingId ? editingId : Date.now().toString(),
        title: document.getElementById('f-title').value,
        location: document.getElementById('f-location').value,
        people: document.getElementById('f-people').value,
        preEmotions: preEmotions,
        rawEmotion: document.getElementById('f-raw-emotion').value,
        description: document.getElementById('f-desc').value,
        audioUrl: document.getElementById('f-audio').value.trim(),
        images: processedImages,
        externalLinks: processedLinks,
        dateAdded: new Date().toISOString()
    };

    if (editingId) {
        const index = visions.findIndex(v => v.id === editingId);
        if(index > -1) visions[index] = visionData;
    } else {
        visions.push(visionData);
    }
    
    saveData();
    closeModals();
    renderDashboard();
});

// DÜZENLEME (EDIT) MODUNU AÇMA
function editVision() {
    const v = visions.find(x => x.id === currentViewingId);
    if(!v) return;

    editingId = v.id;
    document.getElementById('form-title').textContent = "Atmosferi Düzenle";
    
    document.getElementById('f-title').value = v.title || '';
    document.getElementById('f-location').value = v.location || '';
    document.getElementById('f-people').value = v.people || '';
    document.getElementById('f-raw-emotion').value = v.rawEmotion || '';
    document.getElementById('f-desc').value = v.description || '';
    document.getElementById('f-audio').value = v.audioUrl || '';

    // Duyguları Temizle ve Geri Yükle
    document.querySelectorAll('.emotion-tag').forEach(t => t.classList.remove('selected'));
    if(v.preEmotions && v.preEmotions.length > 0) {
        const defaultTagsElements = Array.from(document.querySelectorAll('.emotion-tag'));
        const defaultTagsTexts = defaultTagsElements.map(t => t.textContent);
        
        v.preEmotions.forEach(emo => {
            if (defaultTagsTexts.includes(emo)) {
                defaultTagsElements.find(t => t.textContent === emo).classList.add('selected');
            } else {
                const newTag = document.createElement('div');
                newTag.className = 'emotion-tag selected';
                newTag.textContent = emo;
                newTag.onclick = function() { toggleTag(this); };
                const container = document.getElementById('pre-emotions-container');
                container.insertBefore(newTag, document.querySelector('.custom-emotion'));
            }
        });
    }

    // Görsel ve Link Alanlarını Doldur
    document.getElementById('image-container').innerHTML = '';
    if(v.images && v.images.length > 0) {
        v.images.forEach(img => addImageField(img.length > 500 ? "" : img));
    }
    
    document.getElementById('link-container').innerHTML = '';
    if(v.externalLinks && v.externalLinks.length > 0) {
        v.externalLinks.forEach(link => addUrlField(link));
    }

    closeModals();
    document.getElementById('form-modal').classList.add('active');
}

// FORM VE GÖRÜNTÜLEME MODALLARI YÖNETİMİ
function openForm() {
    editingId = null;
    document.getElementById('form-title').textContent = "Yeni Atmosfer Yarat";
    document.getElementById('vision-form').reset();
    document.querySelectorAll('.emotion-tag.selected').forEach(t => t.classList.remove('selected'));
    document.getElementById('image-container').innerHTML = '';
    document.getElementById('link-container').innerHTML = '';
    addImageField(); 
    
    closeModals();
    document.getElementById('form-modal').classList.add('active');
}

function openView(id) {
    currentViewingId = id;
    const v = visions.find(x => x.id === id);
    if(!v) return;

    document.getElementById('v-title').textContent = v.title || '';
    
    let metaText = [];
    if(v.location) metaText.push(`📍 ${v.location}`);
    if(v.people) metaText.push(`👥 ${v.people}`);
    document.getElementById('v-meta').textContent = metaText.join('  |  ');

    const emotionsBox = document.getElementById('v-emotions-box');
    emotionsBox.innerHTML = '';
    if(v.rawEmotion) {
        emotionsBox.innerHTML += `<div class="view-emotion-badge" style="background: var(--text-primary); color: #fff;">His: ${v.rawEmotion}</div>`;
    }
    if(v.preEmotions && v.preEmotions.length > 0) {
        v.preEmotions.forEach(emo => {
            emotionsBox.innerHTML += `<div class="view-emotion-badge">${emo}</div>`;
        });
    }

    document.getElementById('v-desc').textContent = v.description || '';

    const linksBox = document.getElementById('v-links');
    linksBox.innerHTML = '';
    if(v.externalLinks && v.externalLinks.length > 0) {
        v.externalLinks.forEach((link, index) => {
            linksBox.innerHTML += `<a href="${link}" target="_blank" class="link-item">🔗 İlham Linki ${index + 1} &rarr;</a>`;
        });
    }

    const gallery = document.getElementById('v-gallery');
    gallery.innerHTML = '';
    if(v.images && v.images.length > 0) {
        v.images.forEach(imgSrc => {
            gallery.innerHTML += `<img src="${imgSrc}" alt="Vizyon">`;
        });
    }

    // Ses Kontrolü
    const audioBox = document.getElementById('v-audio-container');
    const record = document.getElementById('v-record');
    record.classList.remove('playing');
    
    if(v.audioUrl) {
        currentAudioLink = v.audioUrl;
        audioBox.style.display = 'flex';
    } else {
        audioBox.style.display = 'none';
        currentAudioLink = "";
    }

    document.getElementById('v-delete-btn').onclick = () => deleteVision(v.id);
    document.getElementById('view-modal').classList.add('active');
}

function playAudio() {
    if(currentAudioLink) {
        const record = document.getElementById('v-record');
        record.classList.add('playing');
        window.open(currentAudioLink, '_blank');
        setTimeout(() => record.classList.remove('playing'), 4000); 
    }
}

function deleteVision(id) {
    if(confirm("Bu atmosferi arşivden silmek istediğine emin misin?")) {
        visions = visions.filter(v => v.id !== id);
        saveData();
        closeModals();
        renderDashboard();
    }
}

function closeModals() {
    document.getElementById('form-modal').classList.remove('active');
    document.getElementById('view-modal').classList.remove('active');
}

function saveData() {
    localStorage.setItem('zen_visions_v3', JSON.stringify(visions));
}
