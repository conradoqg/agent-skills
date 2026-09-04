const projects = [
  { name: "Atlas", status: "Delayed", owner: "Mariana Costa", milestone: "Vendor acceptance", risk: "Identity vendor dependency", recovery: "08/09/26" },
  { name: "Borealis", status: "Blocked", owner: "Ravi Shah", milestone: "Security review", risk: "Missing data-processing agreement", recovery: "2026-09-12" },
  { name: "Cedar", status: "On track", owner: "Nia Okafor", milestone: "Pilot launch", risk: "None recorded", recovery: "Not needed" },
  { name: "Delta", status: "On track", owner: "Luis Lima", milestone: "Training", risk: "None recorded", recovery: "Not needed" }
];

const rows = document.querySelector("#project-rows");
const filter = document.querySelector("#attention-filter");
const summary = document.querySelector("#filter-summary");
const portfolio = document.querySelector("#portfolio-view");
const detail = document.querySelector("#detail-view");

function render(filtered = false) {
  const visible = filtered ? projects.filter((project) => project.status === "Blocked") : projects;
  rows.innerHTML = visible.map((project) => `
    <tr>
      <td>${project.name}</td>
      <td><span class="status ${project.status.toLowerCase().replace(" ", "-")}">${project.status}</span></td>
      <td>${project.owner}</td>
      <td>${project.milestone}</td>
      <td><button type="button" data-project="${project.name}">View ${project.name}</button></td>
    </tr>`).join("");
  summary.textContent = filtered ? `Showing ${visible.length} of 2 projects needing attention` : "Showing all projects";
  rows.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => showProject(button.dataset.project)));
}

function showProject(name) {
  const project = projects.find((candidate) => candidate.name === name);
  portfolio.hidden = true;
  detail.hidden = false;
  document.querySelector("#project-name").textContent = project.name;
  document.querySelector("#project-status").textContent = project.status;
  document.querySelector("#project-owner").textContent = project.owner;
  document.querySelector("#project-risk").textContent = project.risk;
  document.querySelector("#project-recovery").textContent = project.recovery;
}

filter.addEventListener("click", () => {
  const active = filter.getAttribute("aria-pressed") !== "true";
  filter.setAttribute("aria-pressed", String(active));
  render(active);
});

document.querySelector("#back").addEventListener("click", () => {
  detail.hidden = true;
  portfolio.hidden = false;
  filter.setAttribute("aria-pressed", "false");
  render(false);
});

document.querySelector("#export").addEventListener("click", () => {
  const toast = document.querySelector("#toast");
  toast.textContent = "Request accepted";
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 10000);
});

render(false);
