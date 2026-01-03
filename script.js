let aprobadas = JSON.parse(localStorage.getItem("aprobadas")) || [];

fetch("asi.json")
  .then(r => r.json())
  .then(data => iniciar(data));

function iniciar(data) {
  const mallaDiv = document.getElementById("malla");
  const statsDiv = document.getElementById("stats");
  const categorias = data.categories;

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

  function reglasEspeciales(creditos) {
    const isAprob = creditos.aprobPorComp["IS"] || 0;

    return {
      A: isAprob >= 24,
      B: creditos.aprobGeneral >= 100,
      C: isAprob >= 63
    };
  }

  function renderStats(creditos) {
    const general = ((creditos.aprobGeneral / creditos.totalGeneral) * 100).toFixed(1);

    let html = `<strong>Avance general (sin Inglés):</strong> ${general}%<br>`;

    for (let c in categorias) {
      const t = creditos.totalPorComp[c];
      const a = creditos.aprobPorComp[c];
      const p = t ? ((a / t) * 100).toFixed(1) : 0;
      html += `${categorias[c][1]}: ${p}% | `;
    }

    statsDiv.innerHTML = html.slice(0, -3);
  }

  function cumplePrerequisitos(prereqs, reglas) {
    return prereqs.every(r =>
      reglas[r] !== undefined ? reglas[r] : aprobadas.includes(r)
    );
  }

  function render() {
    mallaDiv.innerHTML = "";
    const creditos = calcularCreditos();
    const reglas = reglasEspeciales(creditos);
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
        mat.style.background = categorias[comp][0];
        mat.innerHTML = `
          ${nombre}<br>
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
