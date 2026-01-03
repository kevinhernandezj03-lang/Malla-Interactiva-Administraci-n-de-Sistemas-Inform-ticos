let aprobadas = JSON.parse(localStorage.getItem("aprobadas")) || [];

fetch("asi.json")
  .then(r => r.json())
  .then(data => iniciar(data));

function iniciar(data) {
  const mallaDiv = document.getElementById("malla");
  const statsDiv = document.getElementById("stats");
  const categorias = data.categories;

  /* =======================
     CÁLCULO DE CRÉDITOS
     ======================= */
  function calcularCreditos() {
    let totalGeneral = 0;
    let aprobGeneral = 0;

    let totalPorComp = {};
    let aprobPorComp = {};

    for (let c in categorias) {
      totalPorComp[c] = 0;
      aprobPorComp[c] = 0;
    }

    for (let s in data.malla) {
      data.malla[s].forEach(m => {
        const [, codigo, creditos, , comp] = m;

        totalPorComp[comp] += creditos;
        if (aprobadas.includes(codigo)) {
          aprobPorComp[comp] += creditos;
        }

        if (comp !== "ING") {
          totalGeneral += creditos;
          if (aprobadas.includes(codigo)) {
            aprobGeneral += creditos;
          }
        }
      });
    }

    return {
      totalGeneral,
      aprobGeneral,
      totalPorComp,
      aprobPorComp
    };
  }

  /* =======================
     REGLAS ESPECIALES A/B/C
     ======================= */
  function reglasEspeciales(creditos) {
    const isAprob = creditos.aprobPorComp["IS"] || 0;

    return {
      A: isAprob >= 24,
      B: creditos.aprobGeneral >= 100,
      C: isAprob >= 63
    };
  }

  /* =======================
     VALIDAR PRERREQUISITOS
     ======================= */
  function cumplePrerequisitos(prereqs, reglas) {
    return prereqs.every(r =>
      reglas[r] !== undefined ? reglas[r] : aprobadas.includes(r)
    );
  }

  /* =======================
     LIMPIEZA EN CASCADA
     ======================= */
  function limpiarAprobadasInvalidas(reglas) {
    let cambio = true;

    while (cambio) {
      cambio = false;

      for (let s in data.malla) {
        data.malla[s].forEach(m => {
          const [, codigo, , , , prereq] = m;

          if (aprobadas.includes(codigo)) {
            if (!cumplePrerequisitos(prereq, reglas)) {
              aprobadas = aprobadas.filter(a => a !== codigo);
              cambio = true;
            }
          }
        });
      }
    }
  }

  /* =======================
     MOSTRAR ESTADÍSTICAS
     ======================= */
  function renderStats(creditos) {
    const general = (
      (creditos.aprobGeneral / creditos.totalGeneral) * 100
    ).toFixed(1);

    let html = `<strong>Avance general (sin Inglés):</strong> ${general}%<br>`;

    for (let c in categorias) {
      const t = creditos.totalPorComp[c];
      const a = creditos.aprobPorComp[c];
      const p = t ? ((a / t) * 100).toFixed(1) : 0;
      html += `${categorias[c][1]}: ${p}% | `;
    }

    statsDiv.innerHTML = html.slice(0, -3);
  }

  /* =======================
     RENDER PRINCIPAL
     ======================= */
  function render() {
    mallaDiv.innerHTML = "";

    // Primer cálculo
    let creditos = calcularCreditos();
    let reglas = reglasEspeciales(creditos);

    // 🔥 Limpieza en cascada
    limpiarAprobadasInvalidas(reglas);

    // Recalcular después de limpiar
    creditos = calcularCreditos();
    reglas = reglasEspeciales(creditos);

    localStorage.setItem("aprobadas", JSON.stringify(aprobadas));
    renderStats(creditos);

    for (let s in data.malla) {
      const sem = document.createElement("div");
      sem.className = "semestre";
      sem.innerHTML = `<h2>${s.toUpperCase()}</h2>`;

      data.malla[s].forEach(m => {
        const [nombre, codigo, creditosMat, , comp, prereq] = m;

        const mat = document.createElement("div");
        mat.className = "materia";
        mat.dataset.comp = comp;

        mat.innerHTML = `
          ${nombre}
          <small>${codigo} (${creditosMat} cr)</small>
        `;

        const bloqueada = !cumplePrerequisitos(prereq, reglas);

        if (bloqueada) mat.classList.add("bloqueada");
        if (aprobadas.includes(codigo)) mat.classList.add("aprobada");

        mat.onclick = () => {
          if (bloqueada) return;

          if (aprobadas.includes(codigo)) {
            aprobadas = aprobadas.filter(a => a !== codigo);
          } else {
            aprobadas.push(codigo);
          }

          localStorage.setItem("aprobadas", JSON.stringify(aprobadas));
          render();
        };

        sem.appendChild(mat);
      });

      mallaDiv.appendChild(sem);
    }
  }

  render();
}
