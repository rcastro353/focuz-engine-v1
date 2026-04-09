// Focuz Engine v2.4 - Lógica "Parent/Child" y Mapeo de Columnas K, L, M, I
function initFocuz(PROD_LINK, CONF_LINK) {
    let config = {}, allProd = [], carrito = [], catAct = "Todas";

    // 1. CARGAR CONFIGURACIÓN (WhatsApp, Redes, Portada)
    Papa.parse(CONF_LINK, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach(row => { if(row.clave) config[row.clave.trim()] = row.valor ? row.valor.trim() : ""; });
            aplicarInterfaz(config);
            cargarProductos();
        }
    });

    function aplicarInterfaz(c) {
        if(c.color_principal) document.documentElement.style.setProperty('--p-color', c.color_principal);
        document.getElementById('brand-name').innerText = c.nombre_tienda || "Focuz Store";
        document.getElementById('dinamic-title').innerText = c.nombre_tienda || "Focuz Store";
        document.getElementById('hero').style.backgroundImage = `url('${c.portada}')`;
        if(c.favicon) document.getElementById('favicon').href = c.favicon;
        
        let socHTML = '';
        if(c.facebook) socHTML += `<a href="${c.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
        if(c.instagram) socHTML += `<a href="${c.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
        if(c.tiktok) socHTML += `<a href="${c.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
        document.getElementById('socials').innerHTML = socHTML;
    }

    function cargarProductos() {
        Papa.parse(PROD_LINK, {
            download: true, header: true, skipEmptyLines: true,
            complete: function(res) {
                allProd = res.data.filter(p => p.Name).map(p => {
                    // Mapeo solicitado por Luis:
                    p.desc = p['Descripción'] || 'Sin descripción disponible.'; // Columna I
                    p.f1 = p['Imagen 1'] || p.Imagen_App; // Columna K
                    p.f2 = p['Imagen 2']; // Columna L
                    p.f3 = p['Imagen 3']; // Columna M
                    p.attr = p['Color/ Estilo'] ? p['Color/ Estilo'].trim() : ""; // Nueva Columna Unificada
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
        
        // AGRUPACIÓN LÓGICA
        const groups = filtered.reduce((acc, i) => { 
            if (!acc[i.Name]) acc[i.Name] = { parent: null, children: [] };
            if (i.attr === "") acc[i.Name].parent = i; // El que no tiene estilo es el Padre
            else acc[i.Name].children.push(i); // Los que tienen estilo son Hijos
            return acc; 
        }, {});

        document.getElementById('productos').innerHTML = Object.values(groups).map(g => {
            const displayItem = g.parent || g.children[0];
            const hasChildren = g.children.length > 0;
            const stockTotal = (g.parent ? parseInt(g.parent.Stock || 0) : 0) + g.children.reduce((s, v) => s + parseInt(v.Stock || 0), 0);
            
            return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="p-card h-100 ${stockTotal <= 0 ? 'opacity-75' : ''}">
                    <img src="${displayItem.f1}" class="p-img" onclick="verDetalle('${displayItem.Name}')">
                    <div class="p-3 text-center">
                        <h6 class="fw-bold small text-truncate mb-1">${displayItem.Name}</h6>
                        <p class="text-success fw-bold mb-2">C$ ${displayItem.Price}</p>
                        <button class="btn btn-main btn-sm w-100 rounded-pill" ${stockTotal <= 0 ? 'disabled' : ''} 
                                onclick="verDetalle('${displayItem.Name}')">
                            ${stockTotal <= 0 ? 'Agotado' : (hasChildren ? 'Ver Opciones' : '+ Agregar')}
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
        document.getElementById('det-price').innerText = "C$ " + main.Price;
        document.getElementById('det-desc').innerText = main.desc;
        document.getElementById('det-img-main').src = main.f1;

        // Galería de fotos K, L, M
        const fotos = [main.f1, main.f2, main.f3].filter(f => f && f.trim() !== "");
        document.getElementById('det-thumbs').innerHTML = fotos.map(f => `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`).join('');

        let selHTML = "";
        if(children.length > 0) {
            selHTML = `<h6 class="small fw-bold mt-3">Selecciona Color/ Estilo:</h6><select id="det-sel" class="form-select mb-3 shadow-sm" onchange="cambiarVar(this)">`;
            children.forEach(v => {
                selHTML += `<option value="${v.ID}|${v.Price}|${v.f1}|${v.Stock}|${v.attr}">${v.attr} - C$ ${v.Price}</option>`;
            });
            selHTML += `</select>`;
        }
        document.getElementById('det-selector-area').innerHTML = selHTML;

        const btn = document.getElementById('det-btn-add');
        // Si hay hijos, forzamos a que elija uno. Si no hay, agregamos el main.
        btn.disabled = children.length > 0 && children[0].Stock <= 0;
        btn.onclick = () => children.length > 0 ? addDesdeDetalle(nombre) : directAdd(nombre);
        
        new bootstrap.Modal(document.getElementById('detalleModal')).show();
    };

    window.cambiarVar = function(sel) {
        const [id, precio, img, stock, attr] = sel.value.split('|');
        document.getElementById('det-price').innerText = "C$ " + precio;
        if(img) document.getElementById('det-img-main').src = img;
        const btn = document.getElementById('det-btn-add');
        btn.disabled = parseInt(stock) <= 0;
        btn.innerText = btn.disabled ? "OPCIÓN AGOTADA" : "AGREGAR AL CARRITO";
    };

    function directAdd(n) {
        const p = allProd.find(prod => prod.Name === n);
        carrito.push({ n: p.Name, v: "Único", p: parseFloat(p.Price), f: p.f1 });
        actualizarCarrito();
    }

    window.addDesdeDetalle = function(n) {
        const sel = document.getElementById('det-sel');
        const [id, precio, img, stock, attr] = sel.value.split('|');
        carrito.push({ n, v: attr, p: parseFloat(precio), f: img });
        actualizarCarrito();
        bootstrap.Modal.getInstance(document.getElementById('detalleModal')).hide();
        new bootstrap.Offcanvas(document.getElementById('cart')).show();
    };

    window.actualizarCarrito = function() {
        const list = document.getElementById('cart-list');
        list.innerHTML = carrito.map((i, idx) => `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${i.f}" style="width:60px; height:60px; object-fit:cover" class="rounded-3 me-3">
                <div class="flex-grow-1"><h6 class="mb-0 small fw-bold">${i.n}</h6><small>${i.v}</small></div>
                <div class="text-end"><b>C$ ${i.p}</b><br><button class="btn btn-sm text-danger p-0 small" onclick="borrarItem(${idx})">✕</button></div>
            </div>`).join('');
        const total = carrito.reduce((s, i) => s + i.p, 0);
        document.getElementById('c-count').innerText = carrito.length;
        document.getElementById('c-total').innerText = "C$ " + total;
        document.getElementById('total-val').innerText = "C$ " + total;
    };

    window.borrarItem = function(idx) { carrito.splice(idx, 1); actualizarCarrito(); };
    window.vaciarCarrito = function() { if(confirm("¿Vaciar carrito?")) { carrito = []; actualizarCarrito(); } };

    window.enviarWhatsApp = function() {
        if(!carrito.length) return;
        let m = `*PEDIDO: ${config.nombre_tienda}*\n` + (config.mensaje_base || "Hola! Vengo de tu web y quiero estos productos:\n\n");
        carrito.forEach(i => m += `✅ *${i.n}* [${i.v}] - C$ ${i.p}\n`);
        m += `\n*TOTAL: C$ ${carrito.reduce((s, i) => s + i.p, 0)}*`;
        window.open(`https://wa.me/${config.celular.replace(/\s+/g,'')}?text=${encodeURIComponent(m)}`, '_blank');
    };
}
