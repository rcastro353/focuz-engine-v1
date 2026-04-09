// Focuz Engine v2.8 - Reparación de Scope y Galería K,L,M
window.initFocuz = function(PROD_LINK, CONF_LINK) {
    console.log("Motor Focuz v2.8 Iniciado");
    
    // Variables globales del motor
    window.config = {};
    window.allProd = [];
    window.carrito = [];
    window.catAct = "Todas";

    // 1. CARGAR CONFIGURACIÓN
    Papa.parse(CONF_LINK, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach(row => { 
                if(row.clave) window.config[row.clave.trim()] = row.valor ? row.valor.trim() : ""; 
            });
            
            // Aplicar Estilos
            if(window.config.color_principal) document.documentElement.style.setProperty('--p-color', window.config.color_principal);
            document.getElementById('brand-name').innerText = window.config.nombre_tienda || "Tienda";
            document.getElementById('dinamic-title').innerText = window.config.nombre_tienda || "Tienda";
            if(window.config.portada) document.getElementById('hero').style.backgroundImage = `url('${window.config.portada}')`;
            
            let socHTML = '';
            if(window.config.facebook) socHTML += `<a href="${window.config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if(window.config.instagram) socHTML += `<a href="${window.config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if(window.config.tiktok) socHTML += `<a href="${window.config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
            document.getElementById('socials').innerHTML = socHTML;

            // 2. CARGAR PRODUCTOS
            cargarProductos(PROD_LINK);
        }
    });

    function cargarProductos(link) {
        Papa.parse(link, {
            download: true, header: true, skipEmptyLines: true,
            complete: function(res) {
                window.allProd = res.data.filter(p => p.Name).map(p => {
                    p.desc = p['Descripción'] || 'Sin descripción adicional.'; 
                    p.f1 = p['Imagen 1'] || p.Imagen_App; 
                    p.f2 = p['Imagen 2']; 
                    p.f3 = p['Imagen 3']; 
                    p.attr = p['Color/ Estilo'] ? p['Color/ Estilo'].trim() : ""; 
                    p.price = parseFloat(p.Price || 0);
                    p.oldPrice = parseFloat(p['Precio Anterior'] || 0); 
                    return p;
                });
                window.renderCats();
                window.filtrar(); 
            }
        });
    }
};

// --- FUNCIONES GLOBALES (FUERA DE INIT PARA QUE SE VEAN) ---

window.renderCats = function() {
    const cats = ["Todas", ...new Set(window.allProd.map(p => p.Category).filter(Boolean))];
    const catDiv = document.getElementById('categories');
    if(catDiv) {
        catDiv.innerHTML = cats.map(c => 
            `<div class="cat-btn ${c==window.catAct?'active':''}" onclick="window.setCat('${c}')">${c}</div>`
        ).join('');
    }
};

window.setCat = function(c) { 
    window.catAct = c; 
    window.filtrar(); 
};

window.filtrar = function() {
    const searchInput = document.getElementById('search');
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = window.allProd.filter(p => (window.catAct === "Todas" || p.Category === window.catAct) && p.Name.toLowerCase().includes(search));
    
    const groups = filtered.reduce((acc, i) => { 
        if (!acc[i.Name]) acc[i.Name] = { parent: null, children: [] };
        if (i.attr === "") acc[i.Name].parent = i; 
        else acc[i.Name].children.push(i);
        return acc; 
    }, {});

    const contenedor = document.getElementById('productos');
    if(!contenedor) return;

    contenedor.innerHTML = Object.values(groups).map(g => {
        const display = g.parent || g.children[0];
        const hasVars = g.children.length > 0;
        const stockTotal = (g.parent ? parseInt(g.parent.Stock || 0) : 0) + g.children.reduce((s, v) => s + parseInt(v.Stock || 0), 0);
        
        let badge = "";
        if(display.oldPrice > display.price) {
            const ahorro = Math.round(((display.oldPrice - display.price) / display.oldPrice) * 100);
            badge = `<span class="badge bg-danger position-absolute m-2">-${ahorro}%</span>`;
        }

        return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="p-card h-100 position-relative ${stockTotal <= 0 ? 'opacity-75' : ''}">
                ${badge}
                <img src="${display.f1}" class="p-img" onclick="window.verDetalle('${display.Name}')">
                <div class="p-3 text-center">
                    <h6 class="fw-bold small text-truncate mb-1">${display.Name}</h6>
                    <p class="text-success fw-bold mb-2">C$ ${display.price}</p>
                    <button class="btn btn-main btn-sm w-100 rounded-pill" ${stockTotal <= 0 ? 'disabled' : ''} 
                        onclick="window.verDetalle('${display.Name}')">
                        ${stockTotal <= 0 ? 'Agotado' : (hasVars ? 'Ver Opciones' : '+ Agregar')}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    window.renderCats();
};

window.verDetalle = function(nombre) {
    const group = window.allProd.filter(p => p.Name === nombre);
    const parent = group.find(p => p.attr === "");
    const children = group.filter(p => p.attr !== "");
    const main = parent || children[0];

    document.getElementById('det-name').innerText = main.Name;
    document.getElementById('det-price').innerText = "C$ " + main.price;
    document.getElementById('det-desc').innerText = main.desc;
    document.getElementById('det-img-main').src = main.f1;

    // Galería K, L, M
    const fotos = [main.f1, main.f2, main.f3].filter(f => f && f.trim() !== "");
    document.getElementById('det-thumbs').innerHTML = fotos.map(f => 
        `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`
    ).join('');

    let selHTML = "";
    const btn = document.getElementById('det-btn-add');

    if(children.length > 0) {
        selHTML = `<h6 class="small fw-bold mt-3">Selecciona Estilo/Color:</h6><select id="det-sel" class="form-select mb-3 shadow-sm" onchange="window.cambiarVar(this)">`;
        selHTML += `<option value="" disabled selected>Escoge una opción...</option>`;
        children.forEach(v => {
            selHTML += `<option value="${v.ID}|${v.price}|${v.f1}|${v.Stock}|${v.attr}">${v.attr} - C$ ${v.price}</option>`;
        });
        selHTML += `</select>`;
        btn.disabled = true;
        btn.innerText = "ELIGE UNA OPCIÓN";
    } else {
        btn.disabled = parseInt(main.Stock) <= 0;
        btn.innerText = btn.disabled ? "AGOTADO" : "AGREGAR AL CARRITO";
        btn.onclick = () => window.directAdd(nombre);
    }
    document.getElementById('det-selector-area').innerHTML = selHTML;
    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.cambiarVar = function(sel) {
    if(!sel.value) return;
    const [id, precio, img, stock, attr] = sel.value.split('|');
    document.getElementById('det-price').innerText = "C$ " + precio;
    if(img && img !== "undefined") document.getElementById('det-img-main').src = img;
    const btn = document.getElementById('det-btn-add');
    btn.disabled = parseInt(stock) <= 0;
    btn.innerText = btn.disabled ? "OPCIÓN AGOTADA" : "AGREGAR AL CARRITO";
    btn.onclick = () => window.addDesdeDetalle(document.getElementById('det-name').innerText);
};

window.directAdd = function(n) {
    const p = window.allProd.find(prod => prod.Name === n);
    window.carrito.push({ n: p.Name, v: "Único", p: p.price, f: p.f1 });
    window.actualizarCarrito();
};

window.addDesdeDetalle = function(n) {
    const sel = document.getElementById('det-sel');
    if(!sel.value) return;
    const [id, precio, img, stock, attr] = sel.value.split('|');
    window.carrito.push({ n, v: attr, p: parseFloat(precio), f: img });
    window.actualizarCarrito();
    bootstrap.Modal.getInstance(document.getElementById('detalleModal')).hide();
    new bootstrap.Offcanvas(document.getElementById('cart')).show();
};

window.actualizarCarrito = function() {
    const list = document.getElementById('cart-list');
    list.innerHTML = window.carrito.map((i, idx) => `
        <div class="d-flex align-items-center mb-3 border-bottom pb-2">
            <img src="${i.f}" style="width:60px; height:60px; object-fit:cover" class="rounded-3 me-3">
            <div class="flex-grow-1"><h6 class="mb-0 small fw-bold text-truncate" style="max-width:140px">${i.n}</h6><small class="text-muted">${i.v}</small></div>
            <div class="text-end"><b>C$ ${i.p}</b><br><button class="btn btn-sm text-danger p-0" onclick="window.borrarItem(${idx})">✕</button></div>
        </div>`).join('');
    const total = window.carrito.reduce((s, i) => s + i.p, 0);
    document.getElementById('c-count').innerText = window.carrito.length;
    document.getElementById('c-total').innerText = "C$ " + total;
    document.getElementById('total-val').innerText = "C$ " + total;
};

window.borrarItem = function(idx) { window.carrito.splice(idx, 1); window.actualizarCarrito(); };
window.vaciarCarrito = function() { if(confirm("¿Vaciar pedido?")) { window.carrito = []; window.actualizarCarrito(); } };

window.enviarWhatsApp = function() {
    if(!window.carrito.length) return;
    let m = `*PEDIDO: ${window.config.nombre_tienda}*\n` + (window.config.mensaje_base || "Hola! Vengo de tu web y quiero estos productos:\n\n");
    window.carrito.forEach(i => m += `✅ *${i.n}* [${i.v}] - C$ ${i.p}\n`);
    m += `\n*TOTAL: C$ ${window.carrito.reduce((s, i) => s + i.p, 0)}*`;
    window.open(`https://wa.me/${window.config.celular.replace(/\s+/g,'')}?text=${encodeURIComponent(m)}`, '_blank');
};
