// Focuz Engine v2.5 - Mapeo K, L, M, I + Lógica de Selección Obligatoria
function initFocuz(PROD_LINK, CONF_LINK) {
    let config = {}, allProd = [], carrito = [], catAct = "Todas";

    // 1. CARGAR CONFIGURACIÓN
    Papa.parse(CONF_LINK, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach(row => { if(row.clave) config[row.clave.trim()] = row.valor ? row.valor.trim() : ""; });
            if(config.color_principal) document.documentElement.style.setProperty('--p-color', config.color_principal);
            document.getElementById('brand-name').innerText = config.nombre_tienda || "Tienda";
            document.getElementById('dinamic-title').innerText = config.nombre_tienda || "Tienda";
            document.getElementById('hero').style.backgroundImage = `url('${config.portada}')`;
            if(config.favicon) document.getElementById('favicon').href = config.favicon;
            
            let socHTML = '';
            if(config.facebook) socHTML += `<a href="${config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if(config.instagram) socHTML += `<a href="${config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if(config.tiktok) socHTML += `<a href="${config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
            document.getElementById('socials').innerHTML = socHTML;

            cargarProductos();
        }
    });

    function cargarProductos() {
        Papa.parse(PROD_LINK, {
            download: true, header: true, skipEmptyLines: true,
            complete: function(res) {
                allProd = res.data.filter(p => p.Name).map(p => {
                    // MAPEADO SOLICITADO POR LUIS
                    p.desc = p['Descripción'] || 'Sin descripción adicional.'; // Columna I
                    p.f1 = p['Imagen 1'] || p.Imagen_App; // Columna K
                    p.f2 = p['Imagen 2']; // Columna L
                    p.f3 = p['Imagen 3']; // Columna M
                    p.attr = p['Color/ Estilo'] ? p['Color/ Estilo'].trim() : ""; // Columna unificada
                    p.price = parseFloat(p.Price || 0);
                    // Lógica de Descuento
                    p.oldPrice = parseFloat(p['Precio Anterior'] || 0); 
                    return p;
                });
                renderCats();
                filtrar();
            }
        });
    }

    window.setCat = function(c) { catAct = c; filtrar(); };

    window.filtrar = function() {
        const search = document.getElementById('search').value.toLowerCase();
        const filtered = allProd.filter(p => (catAct === "Todas" || p.Category === catAct) && p.Name.toLowerCase().includes(search));
        
        const groups = filtered.reduce((acc, i) => { 
            if (!acc[i.Name]) acc[i.Name] = { parent: null, children: [] };
            if (i.attr === "") acc[i.Name].parent = i; 
            else acc[i.Name].children.push(i);
            return acc; 
        }, {});

        document.getElementById('productos').innerHTML = Object.values(groups).map(g => {
            const display = g.parent || g.children[0];
            const hasVars = g.children.length > 0;
            const stockTotal = (g.parent ? parseInt(g.parent.Stock || 0) : 0) + g.children.reduce((s, v) => s + parseInt(v.Stock || 0), 0);
            
            // SEÑAL DE DESCUENTO
            let badgeDescuento = "";
            if(display.oldPrice > display.price) {
                const ahorro = Math.round(((display.oldPrice - display.price) / display.oldPrice) * 100);
                badgeDescuento = `<span class="badge bg-danger position-absolute m-2" style="z-index:10">-${ahorro}%</span>`;
            }

            return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="p-card h-100 position-relative ${stockTotal <= 0 ? 'opacity-75' : ''}">
                    ${badgeDescuento}
                    <img src="${display.f1}" class="p-img" onclick="verDetalle('${display.Name}')">
                    <div class="p-3 text-center">
                        <h6 class="fw-bold small text-truncate mb-1">${display.Name}</h6>
                        <p class="text-success fw-bold mb-2">C$ ${display.price}</p>
                        <button class="btn btn-main btn-sm w-100 rounded-pill" ${stockTotal <= 0 ? 'disabled' : ''} 
                            onclick="verDetalle('${display.Name}')">
                            ${stockTotal <= 0 ? 'Agotado' : (hasVars ? 'Ver Opciones' : '+ Agregar')}
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        const cats = ["Todas", ...new Set(allProd.map(p => p.Category).filter(Boolean))];
        document.getElementById('categories').innerHTML = cats.map(c => `<div class="cat-btn ${c==catAct?'active':''}" onclick="setCat('${c}')">${c}</div>`).join('');
    };

    window.verDetalle = function(nombre) {
        const group = allProd.filter(p => p.Name === nombre);
        const parent = group.find(p => p.attr === "");
        const children = group.filter(p => p.attr !== "");
        const main = parent || children[0];

        document.getElementById('det-name').innerText = main.Name;
        document.getElementById('det-price').innerText = "C$ " + main.price;
        document.getElementById('det-desc').innerText = main.desc;
        document.getElementById('det-img-main').src = main.f1;

        // Galería Dinámica K, L, M
        const fotos = [main.f1, main.f2, main.f3].filter(f => f && f.trim() !== "");
        document.getElementById('det-thumbs').innerHTML = fotos.map(f => `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`).join('');

        let selHTML = "";
        const btn = document.getElementById('det-btn-add');

        if(children.length > 0) {
            selHTML = `<h6 class="small fw-bold mt-3">Selecciona Estilo/Color:</h6><select id="det-sel" class="form-select mb-3 shadow-sm" onchange="cambiarVar(this)">`;
            selHTML += `<option value="" disabled selected>Escoge una opción...</option>`; // Obligamos a elegir
            children.forEach(v => {
                selHTML += `<option value="${v.ID}|${v.price}|${v.f1}|${v.Stock}|${v.attr}">${v.attr} - C$ ${v.price}</option>`;
            });
            selHTML += `</select>`;
            btn.disabled = true; // Desactivado hasta que elijan
            btn.innerText = "ELIGE UNA OPCIÓN";
        } else {
            btn.disabled = parseInt(main.Stock) <= 0;
            btn.innerText = btn.disabled ? "AGOTADO" : "AGREGAR AL CARRITO";
            btn.onclick = () => directAdd(nombre);
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
        if(parseInt(stock) <= 0) {
            btn.disabled = true;
            btn.innerText = "OPCIÓN AGOTADA";
        } else {
            btn.disabled = false;
            btn.innerText = "AGREGAR AL CARRITO";
            btn.onclick = () => addDesdeDetalle(document.getElementById('det-name').innerText);
        }
    };

    function directAdd(n) {
        const p = allProd.find(prod => prod.Name === n);
        carrito.push({ n: p.Name, v: "Único", p: p.price, f: p.f1 });
        updateCart();
    }

    window.addDesdeDetalle = function(n) {
        const sel = document.getElementById('det-sel');
        const [id, precio, img, stock, attr] = sel.value.split('|');
        carrito.push({ n, v: attr, p: parseFloat(precio), f: img });
        updateCart();
        bootstrap.Modal.getInstance(document.getElementById('detalleModal')).hide();
        new bootstrap.Offcanvas(document.getElementById('cart')).show();
    };

    window.updateCart = function() {
        const list = document.getElementById('cart-list');
        list.innerHTML = carrito.map((i, idx) => `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${i.f}" style="width:60px; height:60px; object-fit:cover" class="rounded-3 me-3">
                <div class="flex-grow-1"><h6 class="mb-0 small fw-bold text-truncate" style="max-width:140px">${i.n}</h6><small class="text-muted">${i.v}</small></div>
                <div class="text-end"><b>C$ ${i.p}</b><br><button class="btn btn-sm text-danger p-0 small" onclick="borrarItem(${idx})">✕</button></div>
            </div>`).join('');
        const total = carrito.reduce((s, i) => s + i.p, 0);
        document.getElementById('c-count').innerText = carrito.length;
        document.getElementById('c-total').innerText = "C$ " + total;
        document.getElementById('total-val').innerText = "C$ " + total;
    };

    window.borrarItem = function(idx) { carrito.splice(idx, 1); updateCart(); };
    window.vaciarCarrito = function() { if(confirm("¿Vaciar pedido?")) { carrito = []; updateCart(); } };

    window.enviarWhatsApp = function() {
        if(!carrito.length) return;
        let m = `*PEDIDO: ${config.nombre_tienda}*\n` + (config.mensaje_base || "Hola! Vengo de tu web y quiero estos productos:\n\n");
        carrito.forEach(i => m += `✅ *${i.n}* [${i.v}] - C$ ${i.p}\n`);
        m += `\n*TOTAL: C$ ${carrito.reduce((s, i) => s + i.p, 0)}*`;
        window.open(`https://wa.me/${config.celular.replace(/\s+/g,'')}?text=${encodeURIComponent(m)}`, '_blank');
    };
}
