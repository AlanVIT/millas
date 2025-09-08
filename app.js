window._usuariosCache = [];

// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBEnl77N25wU51xPLp-w31AN8g0Eu9kxP4",
  authDomain: "millas-7e0f9.firebaseapp.com",
  projectId: "millas-7e0f9",
  storageBucket: "millas-7e0f9.firebasestorage.app",
  messagingSenderId: "179263317345",
  appId: "1:179263317345:web:18181989c5d9e58b649120"
};

// ================== Firebase ==================
const appFB = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ========= Render base =========
const appDiv = document.getElementById("app");
const render = (html) => (appDiv.innerHTML = html);
const esc = (s="") => s
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");

// ========= Login / Register =========
function viewLogin() {
  render(`
    <div class="container">
      <h2>Login</h2>
      <input id="login-email" placeholder="Email" autocomplete="username">
      <input id="login-pass" type="password" placeholder="Contraseña" autocomplete="current-password">
      <button id="btn-login">Ingresar</button>
      <p>¿No tenés cuenta? <a href="#" id="link-register">Registrate aquí</a></p>
    </div>
  `);
  document.getElementById("btn-login").onclick = login;
  document.getElementById("link-register").onclick = (e)=>{e.preventDefault(); viewRegister();};
}

function viewRegister() {
  render(`
    <div class="container">
      <h2>Registro</h2>
      <input id="reg-email" placeholder="Email" autocomplete="username">
      <input id="reg-pass" type="password" placeholder="Contraseña" autocomplete="new-password">
      <button id="btn-register">Crear cuenta</button>
      <p><a href="#" id="link-back">Volver al login</a></p>
    </div>
  `);
  document.getElementById("btn-register").onclick = register;
  document.getElementById("link-back").onclick = (e)=>{e.preventDefault(); viewLogin();};
}

// ========= Admin =========
function viewAdminMenu() {
  render(`
    <div class="container">
      <h2>Panel Admin</h2>
      <p>Elegí qué querés administrar:</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin:16px 0;">
        <button onclick="renderAdminUsuarios()">Administrar Usuarios</button>
        <button onclick="renderAdminPremios()">Administrar Recompensas</button>
        <button onclick="renderAdminCanjes()">Canjes pendientes</button>   <!-- NUEVO -->
      </div>
      <hr>
      <button onclick="logout()">Cerrar sesión</button>
    </div>
  `);
}

async function renderAdminCanjes() {
  // PENDIENTES
  let pendSnap;
  try {
    pendSnap = await db.collection("canjes")
      .where("estado","==","pendiente")
      .orderBy("fecha","desc").get();
  } catch {
    pendSnap = await db.collection("canjes").where("estado","==","pendiente").get();
  }

  // HISTORIAL (entregados)
  let histSnap;
  try {
    histSnap = await db.collection("canjes")
      .where("estado","==","entregado")
      .orderBy("fecha","desc").get();
  } catch {
    histSnap = await db.collection("canjes").where("estado","==","entregado").get();
  }

  const rowPend = (id, c) => `
    <tr>
      <td>${c.fecha}</td>
      <td>${c.email || c.userId}</td>
      <td>${c.premioNombre || c.premioId}</td>
      <td style="text-align:right;">${c.valor}</td>
      <td style="text-align:right;">
        <button onclick="marcarEntregado('${id}')">Marcar entregado</button>
      </td>
    </tr>
  `;

  const rowHist = (id, c) => `
    <tr>
      <td>${c.fecha}</td>
      <td>${c.email || c.userId}</td>
      <td>${c.premioNombre || c.premioId}</td>
      <td style="text-align:right;">${c.valor}</td>
      <td>${c.entregadoAt ? new Date(c.entregadoAt).toLocaleString() : "-"}</td>
      <td style="text-align:right;">
        <button onclick="revertirAPendiente('${id}')">Volver a pendiente</button>
      </td>
    </tr>
  `;

  let rowsPend = "";
  pendSnap.forEach(d => rowsPend += rowPend(d.id, d.data()));

  let rowsHist = "";
  histSnap.forEach(d => rowsHist += rowHist(d.id, d.data()));

  render(`
    <div class="container">
      <h2>Canjes</h2>

      <h3>Pendientes</h3>
      <div style="max-height:240px; overflow:auto; border:1px solid #eee; border-radius:8px; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="text-align:left; border-bottom:1px solid #ddd;">
              <th>Fecha</th><th>Email/UID</th><th>Premio</th><th style="text-align:right;">Millas</th><th style="text-align:right;">Acción</th>
            </tr>
          </thead>
          <tbody>${rowsPend || `<tr><td colspan="5"><i>No hay canjes pendientes.</i></td></tr>`}</tbody>
        </table>
      </div>

      <h3>Historial (entregados)</h3>
      <div style="max-height:300px; overflow:auto; border:1px solid #eee; border-radius:8px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="text-align:left; border-bottom:1px solid #ddd;">
              <th>Fecha</th><th>Email/UID</th><th>Premio</th><th style="text-align:right;">Millas</th><th>Entregado</th><th style="text-align:right;">Acción</th>
            </tr>
          </thead>
          <tbody>${rowsHist || `<tr><td colspan="6"><i>Sin historial.</i></td></tr>`}</tbody>
        </table>
      </div>

      <hr>
      <div style="display:flex; gap:8px; justify-content:space-between;">
        <button onclick="viewAdminMenu()">Volver al menú</button>
        <button onclick="logout()">Cerrar sesión</button>
      </div>
    </div>
  `);
}


function nowTs() {
  return firebase.firestore.Timestamp.now();
}
function tsToLocalString(tsOrAny) {
  // Acepta Timestamp o string viejo (por compatibilidad)
  if (tsOrAny && typeof tsOrAny.toDate === "function") {
    const d = tsOrAny.toDate();
    // dd/mm/yyyy hh:mm:ss (locale)
    const pad = (n) => String(n).padStart(2, "0");
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  }
  return tsOrAny || ""; // si quedó un string viejo
}

// Admin marca un canje como entregado
async function marcarEntregado(canjeId) {
  const adminUid = auth.currentUser?.uid || null;
  const nowIso = new Date().toISOString();
  try {
    await db.collection("canjes").doc(canjeId).update({
      estado: "entregado",
      entregadoPor: adminUid,
      entregadoAt: nowIso
    });
    renderAdminCanjes();
  } catch (e) {
    console.error(e);
    alert("No se pudo marcar como entregado: " + (e.code || e.message));
  }
}

async function revertirAPendiente(canjeId) {
  if (!confirm("¿Volver este canje a estado pendiente?")) return;
  try {
    await db.collection("canjes").doc(canjeId).update({
      estado: "pendiente",
      entregadoPor: null,
      entregadoAt: null
    });
    renderAdminCanjes();
  } catch (e) {
    console.error(e);
    alert("No se pudo revertir: " + (e.code || e.message));
  }
}


async function routeAfterAuth(uid) {
  const u = await db.collection("usuarios").doc(uid).get();
  if (!u.exists) {
    await db.collection("usuarios").doc(uid).set({
      email: auth.currentUser?.email || "",
      admin: false,
      saldo: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  const data = (await db.collection("usuarios").doc(uid).get()).data();
  if (data.admin === true) return viewAdminMenu();   // admin → menú admin
  return viewUserHome(uid);                           // usuario → menú usuario
}

async function renderAdminUsuarios() {
  // Si es la primera vez o el cache está vacío, cargar de Firestore
  if (!window._usuariosCache || window._usuariosCache.length === 0) {
    const snap = await db.collection("usuarios").where("admin","==",false).get();
    window._usuariosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // UI base con buscador

    const uploadBlock = `
    <div style="border:1px dashed #999; padding:12px; border-radius:10px; margin:12px 0;">
        <h3 style="margin:6px 0;">Carga masiva por archivo</h3>
        <p style="margin:0 0 8px 0; color:#555;">
        Formato: Columna A = <b>email</b>, Columna B = <b>millas a sumar</b> (puede ser negativo).<br>
        Acepta .xlsx (SheetJS) o .csv.
        </p>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input id="bulk-file" type="file" accept=".xlsx,.csv">
        <button id="btn-bulk-preview">Previsualizar</button>
        <button id="btn-bulk-apply" disabled>Aplicar cambios</button>
        </div>
        <div id="bulk-result" style="margin-top:10px;"></div>
    </div>
    `;

    render(`
    <div class="container">
        <h2>Administrar Usuarios</h2>
        <p style="margin-top:-4px;color:#555">Buscá por email y ajustá millas de usuarios (solo no-admin).</p>

        <!-- Buscador existente -->
        <input id="search-email" placeholder="Buscar por email (ej: @empresa.com)" style="flex:1;width:94%;">
        <div style="display:flex; gap:8px; margin:8px 0;">
        <button id="btn-clear">Limpiar</button>
        <button id="btn-refresh">Refrescar</button>
        </div>

        ${uploadBlock}  <!-- << AQUI EL BLOQUE NUEVO -->

        <div id="users-list"><i>Cargando...</i></div>
        <div id="movs-detalle" style="margin:12px 0;"></div>
        <hr>
        <div style="display:flex; gap:8px; justify-content:space-between;">
        <button onclick="viewAdminMenu()">Volver al menú</button>
        <button onclick="logout()">Cerrar sesión</button>
        </div>
    </div>
    `);
 document.getElementById("btn-bulk-preview").onclick = async () => {
    const file = document.getElementById("bulk-file").files?.[0];
    if (!file) return alert("Elegí un archivo .xlsx o .csv");
    await bulkPreview(file);
  };
  document.getElementById("btn-bulk-apply").onclick = async () => {
    await bulkApply();
  };

  // Render inicial (todos)
  renderUserList(window._usuariosCache);

  // Handlers de búsqueda
  const input = document.getElementById("search-email");
  const clear = document.getElementById("btn-clear");
  const refresh = document.getElementById("btn-refresh");

  const applyFilter = () => {
    const q = (input.value || "").toLowerCase().trim();
    if (!q) return renderUserList(window._usuariosCache);
    const filtered = window._usuariosCache.filter(u => (u.email || "").toLowerCase().includes(q));
    renderUserList(filtered);
  };

  input.addEventListener("input", debounce(applyFilter, 150));
  clear.onclick = () => { input.value = ""; renderUserList(window._usuariosCache); };

  // Refrescar desde Firestore (por si hubo cambios de saldo/altas nuevas)
  refresh.onclick = async () => {
    const snap = await db.collection("usuarios").where("admin","==",false).get();
    window._usuariosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyFilter();
  };

}

async function renderAdminPremios() {
  const premiosSnap = await db.collection("premios").orderBy("nombre","asc").get();
  let filas = "";
  premiosSnap.forEach(doc=>{
    const p = doc.data();
    filas += `
      <tr>
        <td>${(p.nombre || "")}</td>
        <td style="text-align:center;">${p.valor}</td>
        <td style="text-align:right;">
          <button onclick="editPremio('${doc.id}', '${(p.nombre || "").replace(/'/g,"&#039;")}', ${p.valor})">Editar</button>
          <button onclick="deletePremio('${doc.id}')">Eliminar</button>
        </td>
      </tr>
    `;
  });

  render(`
    <div class="container">
      <h2>Administrar Recompensas</h2>

      <input id="p-nombre" placeholder="Nombre del premio" style="flex:2;width:94%;">
      <input id="p-valor" type="number" placeholder="Valor en millas" style="flex:1;width:94%;">
      <div style="border:1px dashed #bbb; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; gap:8px; align-items:center;">
        <button onclick="crearPremio()">Agregar</button>
      </div>

      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="text-align:left; border-bottom:1px solid #ddd;">
            <th>Nombre</th>
            <th style="text-align:center;">Valor (millas)</th>
            <th style="text-align:right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filas || `<tr><td colspan="3"><i>Sin premios cargados</i></td></tr>`}
        </tbody>
      </table>

      <hr>
      <div style="display:flex; gap:8px; justify-content:space-between;">
        <button onclick="viewAdminMenu()">Volver al menú</button>
        <button onclick="logout()">Cerrar sesión</button>
      </div>
    </div>
  `);
}

async function crearPremio() {
  const nombre = document.getElementById("p-nombre").value.trim();
  const valor  = parseInt(document.getElementById("p-valor").value, 10);
  if (!nombre || isNaN(valor) || valor <= 0) return alert("Completá nombre y valor (>0).");
  await db.collection("premios").add({ nombre, valor });
  renderAdminPremios();
}

async function deletePremio(id) {
  if (!confirm("¿Eliminar este premio?")) return;
  await db.collection("premios").doc(id).delete();
  renderAdminPremios();
}

// Admin: ajustar millas a usuario no-admin
async function ajustarMillas(uidObjetivo) {
  const input = document.getElementById(`adj-${uidObjetivo}`);
  const delta = parseInt(input.value, 10);
  if (isNaN(delta)) return alert("Ingresá un número válido (positivo o negativo).");

  const target = await db.collection("usuarios").doc(uidObjetivo).get();
  if (!target.exists) return alert("Usuario no encontrado");
  if (target.data().admin === true) return alert("No podés ajustar cuentas admin.");

  try {
    await db.collection("movimientos").add({
      empleado: uidObjetivo,
      fecha: nowTs(),
      concepto: "Ajuste por admin",
      millas: delta
    });

    const saldoActual = target.data().saldo || 0;
    await db.collection("usuarios").doc(uidObjetivo).update({ saldo: saldoActual + delta });

    await viewAdminMenu();
  } catch (e) {
    console.error(e);
    alert("Error ajustando millas: " + (e.code || e.message));
  }
}

// Admin: ver movimientos de un usuario
async function verMovs(uidObjetivo) {
  let movsSnap;
  try {
    movsSnap = await db.collection("movimientos")
      .where("empleado","==",uidObjetivo)
      .orderBy("fecha","desc")
      .get();
  } catch {
    movsSnap = await db.collection("movimientos")
      .where("empleado","==",uidObjetivo)
      .get();
  }

  let html = "<h4>Movimientos</h4>";
  movsSnap.forEach(d=>{
    const m = d.data();
    html += `<p>${tsToLocalString(m.fecha)} — ${m.concepto}: <b>${m.millas}</b> millas</p>`;
  });
  document.getElementById("movs-detalle").innerHTML = html || "<i>Sin movimientos</i>";
}

// Render formulario de edición
async function editPremio(id, nombreActual, valorActual) {
  render(`
    <div class="container">
      <h2>Editar Premio</h2>
      <input id="edit-nombre" value="${esc(nombreActual)}" placeholder="Nombre del premio">
      <input id="edit-valor" type="number" value="${valorActual}" placeholder="Valor en millas">
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button onclick="guardarEdicionPremio('${id}')">Guardar</button>
        <button onclick="viewAdminMenu()">Cancelar</button>
      </div>
    </div>
  `);
}

function editPremio(id, nombreActual, valorActual) {
  render(`
    <div class="container">
      <h2>Editar Premio</h2>
      <input id="edit-nombre" value="${(nombreActual || "").replace(/"/g,"&quot;")}" placeholder="Nombre del premio">
      <input id="edit-valor" type="number" value="${valorActual}" placeholder="Valor en millas">
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button onclick="guardarEdicionPremio('${id}')">Guardar</button>
        <button onclick="renderAdminPremios()">Cancelar</button>
      </div>
    </div>
  `);
}

async function guardarEdicionPremio(id) {
  const nombre = document.getElementById("edit-nombre").value.trim();
  const valor  = parseInt(document.getElementById("edit-valor").value, 10);
  if (!nombre || isNaN(valor) || valor <= 0) return alert("Datos inválidos.");
  await db.collection("premios").doc(id).update({ nombre, valor });
  alert("Premio actualizado.");
  renderAdminPremios();
}

// Guardar cambios y volver al panel admin
async function guardarEdicionPremio(id) {
  const nombre = document.getElementById("edit-nombre").value.trim();
  const valor = parseInt(document.getElementById("edit-valor").value, 10);

  if (!nombre || isNaN(valor) || valor <= 0) {
    alert("Datos inválidos.");
    return;
  }

  try {
    await db.collection("premios").doc(id).update({ nombre, valor });
    alert("Premio actualizado con éxito");
    await viewAdminMenu();
  } catch (e) {
    console.error(e);
    alert("Error al editar premio: " + (e.code || e.message));
  }
}

function editUsuario(uid, email, saldoActual) {
  render(`
    <div class="container">
      <h2>Editar Usuario</h2>
      <p style="color:#555; margin-top:-6px;">${email ? email : "(sin email)"}<br><small>UID: ${uid}</small></p>

      <div style="display:grid; gap:10px; margin:12px 0;">
        <label style="text-align:left;">Saldo actual
          <input value="${saldoActual}" disabled>
        </label>

        <label style="text-align:left;">Nuevo saldo (millas)
          <input id="nuevo-saldo" type="number" placeholder="Ej: 120">
        </label>

        <label style="text-align:left;">Motivo / concepto (opcional)
          <input id="motivo-ajuste" placeholder="Ej: Corrección de carga, bono, etc.">
        </label>

        <label style="text-align:left;">Fecha (opcional)
          <input id="fecha-ajuste" type="date" value="${tsToLocalString(nowTs())}">
        </label>
      </div>

      <div style="display:flex; gap:8px;">
        <button onclick="guardarEdicionUsuario('${uid}', ${saldoActual})">Guardar</button>
        <button onclick="renderAdminUsuarios()">Cancelar</button>
      </div>
    </div>
  `);
}

function userCard(u) {
  return `
    <div style="border:1px solid #ddd; padding:12px; margin:10px 0; border-radius:10px;">
      <div style="font-weight:600">${(u.email || "(sin email)")}</div>
      <div style="font-size:12px;color:#777">UID: ${u.id}</div>
      <div>Saldo: <b>${u.saldo || 0}</b> millas</div>
      <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <input id="adj-${u.id}" type="number" placeholder="Millas (+/-)" style="flex:1; min-width:160px;">
        <button onclick="ajustarMillas('${u.id}')">Aplicar</button>
        <button onclick="verMovs('${u.id}')">Movs</button>
        <button onclick="editUsuario('${u.id}', '${(u.email||"").replace(/'/g,"&#039;")}', ${u.saldo || 0})">Editar</button>
      </div>
    </div>
  `;
}
function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}


// Renderiza la lista a partir de un array (filtrado o completo)
function renderUserList(list) {
  const cont = document.getElementById("users-list");
  if (!cont) return;
  cont.innerHTML = list.length ? list.map(userCard).join("") : "<i>No hay usuarios para mostrar.</i>";
}

// Guarda el nuevo saldo absoluto, registra movimiento con el delta y vuelve a la vista de usuarios
async function guardarEdicionUsuario(uid, saldoAnterior) {
  const nuevoSaldoStr = document.getElementById("nuevo-saldo").value;
  const motivo = (document.getElementById("motivo-ajuste").value || "").trim();
  const fecha = document.getElementById("fecha-ajuste").value || new Date().toISOString().slice(0,10);

  const nuevoSaldo = parseInt(nuevoSaldoStr, 10);
  if (isNaN(nuevoSaldo)) {
    alert("Ingresá un número válido para el nuevo saldo.");
    return;
  }

  const delta = nuevoSaldo - (parseInt(saldoAnterior,10) || 0);
  if (delta === 0) {
    alert("El nuevo saldo es igual al actual. No hay cambios.");
    return renderAdminUsuarios();
  }

  try {
    // Seguridad suave: no editar admins
    const tgt = await db.collection("usuarios").doc(uid).get();
    if (!tgt.exists) return alert("Usuario no encontrado.");
    if (tgt.data().admin === true) return alert("No podés editar cuentas admin.");

    // Usamos una transacción para mantener consistencia (saldo y movimiento)
    await db.runTransaction(async (tx) => {
      const ref = db.collection("usuarios").doc(uid);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Usuario no encontrado en transacción.");
      const saldoActual = snap.data().saldo || 0;
      const nuevo = nuevoSaldo;

      // Actualizar saldo
      tx.update(ref, { saldo: nuevo });

      // Registrar movimiento por la diferencia (delta)
      const concepto = `Ajuste directo por admin${motivo ? " — " + motivo : ""} (antes ${saldoActual} → ahora ${nuevo})`;
      const movRef = db.collection("movimientos").doc(); // auto-id
      tx.set(movRef, {
        empleado: uid,
        fecha,
        concepto,
        millas: delta
      });
    });

    alert("Saldo actualizado correctamente.");
    renderAdminUsuarios();
  } catch (e) {
    console.error(e);
    alert("Error al guardar cambios: " + (e.code || e.message || e));
  }
}

// ========= Usuario =========
async function viewUser(uid) {
  const userDoc = await db.collection("usuarios").doc(uid).get();
  const saldo = userDoc.exists ? (userDoc.data().saldo || 0) : 0;

  let movsSnap;
  try {
    movsSnap = await db.collection("movimientos")
      .where("empleado","==",uid)
      .orderBy("fecha","desc")
      .get();
  } catch {
    movsSnap = await db.collection("movimientos")
      .where("empleado","==",uid)
      .get();
  }

  let movsHTML = "";
  movsSnap.forEach(d=>{
    const m = d.data();
    movsHTML += `<p>${tsToLocalString(m.fecha)} — ${m.concepto}: <b>${m.millas}</b> millas</p>`;
  });

  const premiosSnap = await db.collection("premios").orderBy("nombre").get();
  let options = "";
  premiosSnap.forEach(d=>{
    const p = d.data();
    options += `<option value="${d.id}" data-valor="${p.valor}">${esc(p.nombre)} — ${p.valor} millas</option>`;
  });

  render(`
    <div class="container">
      <h2>Extra Millas ZOOM</h2>
      <h1 id="saldo">Saldo: <b>${saldo}</b></h1>
      <div id="movimientos">${movsHTML || "<i>Sin movimientos</i>"}</div>
      <h3>Canjear Recompensas</h3>
      <select id="premios">${options}</select>
      <button id="btn-canjear">Canjear</button>
      <hr>
      <button onclick="logout()">Cerrar sesión</button>
    </div>
  `);
  document.getElementById("btn-canjear").onclick = canjear;
}

function viewUserHome(uid) {
  render(`
    <div class="container">
      <h2>Mi Panel</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin:16px 0;">
        <button onclick="viewUserCanjear('${uid}')">Canje de premios</button>
        <button onclick="viewUserPendientes('${uid}')">Mis canjes pendientes</button>
      </div>
      <hr>
      <button onclick="logout()">Cerrar sesión</button>
    </div>
  `);
}

async function canjear() {
  const sel = document.getElementById("premios");
  if (!sel || !sel.value) return alert("Elegí un premio.");
  const uid = auth.currentUser.uid;

  const premioId = sel.value;

  // 1) Intentar obtener el premio desde Firestore (preferido)
  let premioNombre, valor;
  try {
    const premioDoc = await db.collection("premios").doc(premioId).get();
    if (!premioDoc.exists) throw new Error("Premio no encontrado");
    const p = premioDoc.data();
    premioNombre = (p?.nombre ?? "").toString().trim();
    valor        = parseInt(p?.valor, 10);
  } catch {
    // 2) Fallback al <option> por si hay cortes de red o similar
    const opt = sel.options[sel.selectedIndex];
    const nameFromData = (opt?.dataset?.nombre ?? "").toString().trim();
    const nameFromText = (opt?.textContent ?? "").split("—")[0].trim();
    const valFromData  = parseInt(opt?.dataset?.valor, 10);

    premioNombre = nameFromData || nameFromText || premioId; // <-- nunca undefined
    valor = Number.isFinite(valFromData) ? valFromData : NaN;
  }

  if (!premioNombre) premioNombre = premioId;      // última red
  if (!Number.isFinite(valor) || valor <= 0) {
    return alert("Valor del premio inválido.");
  }

  // 3) Validar saldo
  const userRef = db.collection("usuarios").doc(uid);
  const userSnap = await userRef.get();
  const saldo = userSnap.data()?.saldo ?? 0;
  if (saldo < valor) return alert("Millas insuficientes.");

  const hoy = new Date().toISOString().slice(0,10);

  // 4) Transacción: descuenta saldo + movimiento + canje pendiente
  try {
    await db.runTransaction(async (tx) => {
      const uSnap = await tx.get(userRef);
      const saldoActual = uSnap.data()?.saldo ?? 0;
      if (saldoActual < valor) throw new Error("Saldo insuficiente al confirmar.");

      // actualizar saldo
      tx.update(userRef, { saldo: saldoActual - valor });

      // movimiento
      const movRef = db.collection("movimientos").doc();
      tx.set(movRef, {
        empleado: uid,
        fecha: nowTs(),
        concepto: `Canje: ${premioNombre}`,
        millas: -valor
      });

      // canje pendiente (sin undefined)
      const canjeRef = db.collection("canjes").doc();
      tx.set(canjeRef, {
        userId: uid,
        email: (uSnap.data()?.email || ""),
        premioId,
        premioNombre,     // <-- ya garantizado string no vacío
        valor,
        fecha: nowTs(),
        estado: "pendiente",
        entregadoPor: null,
        entregadoAt: null
      });
    });

    alert("Canje realizado: quedó PENDIENTE de entrega.");
    viewUserPendientes(uid);
  } catch (e) {
    console.error(e);
    alert("No se pudo realizar el canje: " + (e.message || e));
  }
}

async function viewUserCanjear(uid) {
  const userDoc = await db.collection("usuarios").doc(uid).get();
  const saldo = userDoc.exists ? (userDoc.data().saldo || 0) : 0;

  let movsSnap;
  try {
    movsSnap = await db.collection("movimientos")
      .where("empleado","==",uid)
      .orderBy("fecha","desc")
      .get();
  } catch {
    movsSnap = await db.collection("movimientos")
      .where("empleado","==",uid)
      .get();
  }

  let movsHTML = "";
  movsSnap.forEach(d=>{
    const m = d.data();
    movsHTML += `<p>${tsToLocalString(m.fecha)} — ${m.concepto}: <b>${m.millas}</b> millas</p>`;
  });

    const premiosSnap = await db.collection("premios").orderBy("nombre").get();
    let options = "";
    premiosSnap.forEach(d=>{
    const p = d.data();
    const nombre = (p.nombre || "").replace(/"/g,"&quot;");
    options += `<option value="${d.id}" data-valor="${p.valor}" data-nombre="${nombre}">
                    ${nombre} — ${p.valor} millas
                </option>`;
    });

  render(`
    <div class="container">
      <h2>Canje de premios</h2>
      <p id="saldo">Saldo: <b>${saldo}</b></p>
      <div id="movimientos">${movsHTML || "<i>Sin movimientos</i>"}</div>
      <h3>Elegir premio</h3>
      <select id="premios">${options}</select>
      <button id="btn-canjear">Canjear</button>
      <hr>
      <div style="display:flex; gap:8px; justify-content:space-between;">
        <button onclick="viewUserHome('${uid}')">Volver</button>
        <button onclick="logout()">Cerrar sesión</button>
      </div>
    </div>
  `);
  document.getElementById("btn-canjear").onclick = canjear;
}

async function viewUserPendientes(uid) {
  // PENDIENTES
  let qPend;
  try {
    qPend = await db.collection("canjes")
      .where("userId","==",uid)
      .where("estado","==","pendiente")
      .orderBy("fecha","desc")
      .get();
  } catch {
    qPend = await db.collection("canjes").where("userId","==",uid).where("estado","==","pendiente").get();
  }

  // ENTREGADOS (historial)
  let qHist;
  try {
    qHist = await db.collection("canjes")
      .where("userId","==",uid)
      .where("estado","==","entregado")
      .orderBy("fecha","desc")
      .get();
  } catch {
    qHist = await db.collection("canjes").where("userId","==",uid).where("estado","==","entregado").get();
  }

  const row = (c) => `
    <tr>
      <td>${c.fecha || ""}</td>
      <td>${c.premioNombre || c.premioId}</td>
      <td style="text-align:right;">${c.valor}</td>
      <td>${c.estado}</td>
      <td>${c.entregadoAt ? new Date(c.entregadoAt).toLocaleString() : "-"}</td>
    </tr>
  `;

  let pendientes = "";
  qPend.forEach(d => pendientes += row(d.data()));

  let historial = "";
  qHist.forEach(d => historial += row(d.data()));

  render(`
    <div class="container">
      <h2>Mis canjes</h2>

      <h3>Pendientes</h3>
      <div style="max-height:220px; overflow:auto; border:1px solid #eee; border-radius:8px; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="position:sticky; top:0; background:#fafafa; border-bottom:1px solid #ddd;">
              <th>Fecha</th><th>Premio</th><th style="text-align:right;">Millas</th><th>Estado</th><th>Entregado</th>
            </tr>
          </thead>
          <tbody>${pendientes || `<tr><td colspan="5"><i>Sin pendientes</i></td></tr>`}</tbody>
        </table>
      </div>

      <h3>Historial entregado</h3>
      <div style="max-height:220px; overflow:auto; border:1px solid #eee; border-radius:8px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="position:sticky; top:0; background:#fafafa; border-bottom:1px solid #ddd;">
              <th>Fecha</th><th>Premio</th><th style="text-align:right;">Millas</th><th>Estado</th><th>Entregado</th>
            </tr>
          </thead>
          <tbody>${historial || `<tr><td colspan="5"><i>Aún no tenés canjes entregados</i></td></tr>`}</tbody>
        </table>
      </div>

      <hr>
      <div style="display:flex; gap:8px; justify-content:space-between;">
        <button onclick="viewUserHome('${uid}')">Volver</button>
        <button onclick="logout()">Cerrar sesión</button>
      </div>
    </div>
  `);
}

// ======== Bulk upload helpers ========
let _bulkRows = [];       // [{email, delta, uid, ok, reason}]
let _bulkByUid = {};      // { uid: totalDelta }
let _bulkPreviewReady = false;

function isXlsx(file) {
  return /\.xlsx$/i.test(file.name);
}

function readFileAsArrayBuffer(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsArrayBuffer(file);
  });
}

function readFileAsText(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsText(file, "utf-8");
  });
}

async function parseXlsx(file) {
  if (typeof XLSX === "undefined") {
    throw new Error("Para .xlsx necesitás XLSX (SheetJS). Incluí el CDN o subí .csv.");
  }
  const buf = await readFileAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  return rows;
}

async function parseCsv(file) {
  const text = await readFileAsText(file);
  // split simple por líneas y coma/;  (si tenés coma en nombre, usá un CSV parser más robusto)
  return text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => line.split(/[,;]\s*/));
}

async function bulkPreview(file) {
  // 1) Parsear archivo (xlsx/csv) a matriz de filas
  let rows;
  try {
    rows = isXlsx(file) ? await parseXlsx(file) : await parseCsv(file);
  } catch (e) {
    console.error(e);
    return alert("No se pudo leer el archivo: " + e.message);
  }
  if (!rows || rows.length === 0) return alert("El archivo está vacío.");

  // 2) Construir mapa email->uid con usuarios no-admin (cache o fetch)
  if (!window._usuariosCache || window._usuariosCache.length === 0) {
    const snap = await db.collection("usuarios").where("admin","==",false).get();
    window._usuariosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const emailToUser = {};
  window._usuariosCache.forEach(u => {
    if (u.email) emailToUser[u.email.toLowerCase()] = { uid: u.id, saldo: u.saldo || 0 };
  });

  // 3) Normalizar/validar filas
  // Asumimos: fila 1 = cabecera o datos. Si detectamos cabecera textual, la saltamos.
  const startIdx = 0;

  _bulkRows = [];
  _bulkByUid = {};
  let okCount = 0, errCount = 0;

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    // Esperamos al menos A y B
    const emailRaw = (r[0] ?? "").toString().trim();
    const deltaRaw = (r[1] ?? "").toString().trim();

    const row = { email: emailRaw, delta: null, uid: null, ok: false, reason: "" };

    if (!emailRaw) {
      row.reason = "Email vacío";
      _bulkRows.push(row); errCount++; continue;
    }
    const user = emailToUser[emailRaw.toLowerCase()];
    if (!user) {
      row.reason = "Usuario no encontrado";
      _bulkRows.push(row); errCount++; continue;
    }
    const delta = parseInt(deltaRaw, 10);
    if (isNaN(delta)) {
      row.reason = "Cantidad inválida";
      _bulkRows.push(row); errCount++; continue;
    }

    row.delta = delta;
    row.uid = user.uid;
    row.ok = true;
    _bulkRows.push(row);
    okCount++;

    // Agrupar por uid para sumar múltiples filas del mismo usuario
    _bulkByUid[user.uid] = (_bulkByUid[user.uid] || 0) + delta;
  }

  // 4) Pintar previsualización
  const res = document.getElementById("bulk-result");
  const rowsHTML = _bulkRows.map((r, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${r.email || ""}</td>
      <td style="text-align:right;">${r.delta ?? ""}</td>
      <td>${r.uid ?? ""}</td>
      <td style="color:${r.ok ? 'green' : 'crimson'}">${r.ok ? "OK" : r.reason}</td>
    </tr>
  `).join("");

  res.innerHTML = `
    <div style="margin:8px 0;">
      <b>Previsualización</b>: ${okCount} válidos, ${errCount} con error.
    </div>
    <div style="max-height:260px; overflow:auto; border:1px solid #eee; border-radius:8px;">
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr style="position:sticky; top:0; background:#fafafa; border-bottom:1px solid #ddd;">
            <th>#</th><th>Email</th><th style="text-align:right;">Delta</th><th>UID</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>
  `;

  // Habilitar “Aplicar” solo si hay algo válido
  _bulkPreviewReady = okCount > 0;
  document.getElementById("btn-bulk-apply").disabled = !_bulkPreviewReady;
}

async function bulkApply() {
  if (!_bulkPreviewReady) return alert("Primero generá la previsualización.");

  // 1) Consolidar por usuario (ya lo tenemos en _bulkByUid)
  const uids = Object.keys(_bulkByUid);
  if (uids.length === 0) return alert("No hay filas válidas para aplicar.");

  // 2) Para evitar exceder límites de batch (500 ops) hacemos en tandas
  // Por usuario: 1 update saldo + N movimientos (usamos 1 movimiento consolidado por usuario)
  // => 2 ops por usuario. Con 200 usuarios = 400 ops (OK)
  // Creamos un único movimiento consolidado por usuario: “Carga masiva (archivo)”
  const CHUNK = 200; // 200 usuarios por tanda
  const today = new Date().toISOString().slice(0,10);

  try {
    for (let i = 0; i < uids.length; i += CHUNK) {
      const chunk = uids.slice(i, i + CHUNK);
      const batch = db.batch();

      // Leer saldos actuales en bloque
      const refs = chunk.map(uid => db.collection("usuarios").doc(uid));
      const snaps = await Promise.all(refs.map(r => r.get()));

      snaps.forEach((snap, idx) => {
        const uid = chunk[idx];
        const delta = _bulkByUid[uid] || 0;
        const data = snap.data() || {};
        const admin = !!data.admin;
        if (admin) return; // seguridad adicional: no tocar admins
        const saldoActual = data.saldo || 0;
        const nuevoSaldo = saldoActual + delta;

        // Update saldo
        batch.update(refs[idx], { saldo: nuevoSaldo });

        // Movimiento
        const movRef = db.collection("movimientos").doc();
        batch.set(movRef, {
          empleado: uid,
          fecha: nowTs(),
          concepto: "Carga masiva (archivo)",
          millas: delta
        });
      });

      await batch.commit();
    }

    alert("Cambios aplicados con éxito.");
    // Invalidar cache y refrescar vista
    window._usuariosCache = [];
    await renderAdminUsuarios();
    // Reset estado bulk
    _bulkPreviewReady = false;
    const br = document.getElementById("bulk-result");
    if (br) br.innerHTML = "";
    const ba = document.getElementById("btn-bulk-apply");
    if (ba) ba.disabled = true;

  } catch (e) {
    console.error(e);
    alert("Error aplicando cambios: " + (e.code || e.message || e));
  }
}

// ========= Auth flow =========
async function login() {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-pass").value;
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    await routeAfterAuth(cred.user.uid);
  } catch (e) {
    console.error(e);
    alert("Contraseña o email incorrecto: ");
  }
}

async function register() {
  const email = document.getElementById("reg-email").value.trim();
  const pass  = document.getElementById("reg-pass").value;
  if (!email || !pass) return alert("Completá email y contraseña");

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    // Siempre NO admin
    await db.collection("usuarios").doc(cred.user.uid).set({
      email,
      admin: false,
      saldo: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await routeAfterAuth(cred.user.uid);
  } catch (e) {
    console.error(e);
    alert("Error en registro: " + (e.code || e.message));
  }
}

async function routeAfterAuth(uid) {
  const u = await db.collection("usuarios").doc(uid).get();
  if (!u.exists) {
    await db.collection("usuarios").doc(uid).set({
      email: auth.currentUser?.email || "",
      admin: false,
      saldo: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return viewUser(uid);
  }
  const data = u.data();
  if (data.admin === true) return viewAdminMenu();
  return viewUser(uid);
}

function logout() {
  auth.signOut();
  viewLogin();
}

auth.onAuthStateChanged(async (u)=>{
  if (!u) return viewLogin();
  await routeAfterAuth(u.uid);
});

// Primera vista
viewLogin();