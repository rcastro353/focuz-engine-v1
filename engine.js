const CSV_PROD = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaItIMXLAtmocAPHIGaONZuWPxhooh702AOJJG8ZPs1sj80oJZ7iB6Q5_dmFquHIGx-5gGSNSBN7xP/pub?gid=2048870662&single=true&output=csv";
        const CSV_CONF = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaItIMXLAtmocAPHIGaONZuWPxhooh702AOJJG8ZPs1sj80oJZ7iB6Q5_dmFquHIGx-5gGSNSBN7xP/pub?gid=1511626760&single=true&output=csv";

        let config = {}, allProd = [], carrito = [], catAct = "Todas";

        // 1. CARGAR CONFIG
        Papa.parse(CSV_CONF, {
            download: true, header: true, complete: function(results) {
                results.data.forEach(row => { if(row.clave) config[row.clave.trim()] = row.valor.trim(); });
                if(config.color_principal) document.documentElement.style.setProperty('--p-color', config.color_principal);
                document.getElementById('brand-name').innerText = config.nombre_tienda || "Chavy";
                document.getElementById('dinamic-title').innerText = config.nombre_tienda || "Chavy";
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
            Papa.parse(CSV_PROD, {
                download: true, header: true, complete: function(res) {
                    allProd = res.data.filter(p => p.Name);
                    renderCats();
                    filtrar();
                }
            });
        }

        function renderCats() {
            const cats = ["Todas", ...new Set(allProd.map(p => p.Category).filter(Boolean))];
            document.getElementById('categories').innerHTML = cats.map(c => `<div class="cat-btn ${c==catAct?'active':''}" onclick="catAct='${c}'; filtrar()">${c}</div>`).join('');
        }

        function filtrar() {
            const search = document.getElementById('search').value.toLowerCase();
            const filtered = allProd.filter(p => (catAct === "Todas" || p.Category === catAct) && p.Name.toLowerCase().includes(search));
            
            // Agrupamos por nombre
            const groups = filtered.reduce((acc, i) => { 
                if (!acc[i.Name]) acc[i.Name] = { ...i, vars: [] }; 
                acc[i.Name].vars.push(i); 
                return acc; 
            }, {});

            document.getElementById('productos').innerHTML = Object.values(groups).map(p => {
                const hasVars = p.vars.length > 1;
                // Foto de Columna L (Imagen_2) o Columna P (Imagen_App)
                const fotoHome = (p.Imagen_2 && p.Imagen_2.trim() !== "") ? p.Imagen_2 : p.Imagen_App;
                
                const stockTotal = p.vars.reduce((sum, v) => sum + parseInt(v.Stock || 0), 0);
                const isAgotado = stockTotal <= 0;
                const btnLabel = isAgotado ? 'Agotado' : (hasVars ? 'Ver Opciones' : '+ Agregar');
                
                return `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="p-card h-100 ${isAgotado ? 'opacity-75' : ''}">
                        <img src="${fotoHome}" class="p-img" onclick="verDetalle('${p.Name}')">
                        <div class="p-3">
                            <h6 class="fw-bold small text-truncate mb-1">${p.Name}</h6>
                            <p class="text-success fw-bold mb-2">C$ ${p.Price}</p>
                            <button class="btn btn-main btn-sm w-100" ${isAgotado ? 'disabled' : ''} 
                                onclick="${hasVars ? `verDetalle('${p.Name}')` : `directAdd('${p.Name}')`}">
                                ${btnLabel}
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        function directAdd(nombre) {
            const p = allProd.find(prod => prod.Name === nombre);
            const stock = parseInt(p.Stock || 0);
            if(stock <= 0) return alert("Lo sentimos, este producto se agotó.");
            
            // Usamos Imagen_2 si existe
            const foto = (p.Imagen_2 && p.Imagen_2.trim() !== "") ? p.Imagen_2 : p.Imagen_App;
            carrito.push({ n: p.Name, v: "Único", p: parseFloat(p.Price), f: foto });
            updateCart();
            new bootstrap.Offcanvas(document.getElementById('cart')).show();
        }

        function verDetalle(nombre) {
            const p = allProd.find(prod => prod.Name === nombre);
            const vars = allProd.filter(prod => prod.Name === nombre);
            
            document.getElementById('det-name').innerText = p.Name;
            document.getElementById('det-price').innerText = "C$ " + p.Price;
            document.getElementById('det-cat').innerText = p.Category || "Catálogo";
            document.getElementById('det-desc').innerText = p.Información || "Sin descripción adicional.";
            
            const fotoPrincipal = (p.Imagen_2 && p.Imagen_2.trim() !== "") ? p.Imagen_2 : p.Imagen_App;
            document.getElementById('det-img-main').src = fotoPrincipal;

            // Galería L, M, N (Imagen 2, 3, 4)
            const fotos = [p.Imagen_App, p.Imagen_2, p.Imagen_3, p.Imagen_4].filter(f => f && f.trim() !== "");
            document.getElementById('det-thumbs').innerHTML = fotos.map(f => `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`).join('');

            let selectorHTML = "";
            if(vars.length > 1) {
                selectorHTML = `<h6 class="small fw-bold mt-3">Selecciona Estilo/Color:</h6><select id="det-sel" class="form-select mb-3 shadow-sm border-0 bg-light" onchange="cambiarVarDetalle(this)">`;
                vars.forEach(v => {
                    const fotoVar = (v.Imagen_2 && v.Imagen_2.trim() !== "") ? v.Imagen_2 : v.Imagen_App;
                    selectorHTML += `<option value="${v.ID}|${v.Price}|${fotoVar}|${v.Stock}|${v['Estilo / Color']}">${v['Estilo / Color']} - C$ ${v.Price}</option>`;
                });
                selectorHTML += `</select>`;
            }
            document.getElementById('det-selector-area').innerHTML = selectorHTML;

            // Botón de Agregar
            const btn = document.getElementById('det-btn-add');
            if(parseInt(p.Stock) <= 0 && vars.length === 1) { btn.disabled = true; btn.innerText = "AGOTADO"; }
            else { btn.disabled = false; btn.innerText = "AGREGAR AL CARRITO"; }
            
            btn.onclick = () => addDesdeDetalle(nombre, p);
            new bootstrap.Modal(document.getElementById('detalleModal')).show();
        }

        function cambiarVarDetalle(sel) {
            const [id, precio, img, stock] = sel.value.split('|');
            document.getElementById('det-price').innerText = "C$ " + precio;
            if(img && img !== "undefined") document.getElementById('det-img-main').src = img;
            
            const btn = document.getElementById('det-btn-add');
            if(parseInt(stock) <= 0) { btn.disabled = true; btn.innerText = "OPCIÓN AGOTADA"; }
            else { btn.disabled = false; btn.innerText = "AGREGAR AL CARRITO"; }
        }

        function addDesdeDetalle(n, pOriginal) {
            const sel = document.getElementById('det-sel');
            let vFinal = "Único", pFinal = pOriginal.Price, imgFinal = (pOriginal.Imagen_2 || pOriginal.Imagen_App), sFinal = pOriginal.Stock;
            
            if(sel) {
                const [vid, vpr, vimg, vs, vnombre] = sel.value.split('|');
                vFinal = vnombre; pFinal = vpr; imgFinal = vimg; sFinal = vs;
            }
            if(parseInt(sFinal) <= 0) return alert("Esta opción no tiene stock.");
            
            carrito.push({ n, v: vFinal, p: parseFloat(pFinal), f: imgFinal });
            updateCart();
            bootstrap.Modal.getInstance(document.getElementById('detalleModal')).hide();
            new bootstrap.Offcanvas(document.getElementById('cart')).show();
        }

        function updateCart() {
            const list = document.getElementById('cart-list');
            list.innerHTML = carrito.map((i, idx) => `
                <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                    <img src="${i.f}" style="width:60px; height:60px; object-fit:cover" class="rounded-3 me-3 shadow-sm">
                    <div class="flex-grow-1"><h6 class="mb-0 small fw-bold text-truncate" style="max-width:140px">${i.n}</h6><small class="text-muted">${i.v}</small></div>
                    <div class="text-end"><b>C$ ${i.p}</b><br><button class="btn btn-sm text-danger p-0 small" onclick="carrito.splice(${idx},1);updateCart()">✕</button></div>
                </div>`).join('');
            const total = carrito.reduce((s, i) => s + i.p, 0);
            document.getElementById('c-count').innerText = carrito.length;
            document.getElementById('c-total').innerText = "C$ " + total;
            document.getElementById('total-val').innerText = "C$ " + total;
        }

        function vaciar() { if(confirm("¿Vaciar todo el carrito?")) { carrito = []; updateCart(); } }

        function enviar() {
            if(!carrito.length) return;
            let m = `*PEDIDO: ${config.nombre_tienda}*\n` + (config.mensaje_base || "Hola! Vengo de tu web y quiero estos productos:\n\n");
            carrito.forEach(i => m += `✅ *${i.n}* [${i.v}] - C$ ${i.p}\n`);
            const total = carrito.reduce((s, i) => s + i.p, 0);
            m += `\n*TOTAL: C$ ${total}*`;
            const tel = config.celular ? config.celular.replace(/\s+/g,'') : "50588888888";
            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(m)}`, '_blank');
        }
