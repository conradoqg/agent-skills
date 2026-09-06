const storageKey = 'learn-desk-v1';
const initial = () => ({ role: 'coordinator', approval: false, selected: ['L-11', 'L-12'], job: null, learners: [
  { id: 'L-11', name: 'Alex Rivera', attendance: 'Present', assessment: 'Current', team: 'Field team' },
  { id: 'L-12', name: 'Sam Lee', attendance: 'Present', assessment: 'Expired', team: 'Field team' },
  { id: 'L-13', name: 'Jo Chen', attendance: 'Absent', assessment: 'Current', team: 'Support team' }
] });
let state = JSON.parse(localStorage.getItem(storageKey) || 'null') || initial();
const content = document.querySelector('#content');
const notice = document.querySelector('#notice');
const role = document.querySelector('#role');
const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
const say = message => { notice.textContent = message; notice.hidden = false; };
const permissions = {
  coordinator: 'Select learners, request certificates and record a renewed assessment. Attendance requires a separate reviewer.',
  reviewer: 'Review attendance and approve the selected learners. Certificate requests belong to the coordinator.',
  viewer: 'Read completion records. Ask a coordinator to make changes.'
};
function settle() {
  if (!state.job || Date.now() < state.job.readyAt) return;
  for (const item of state.job.items) if (item.status === 'Pending') {
    const learner = state.learners.find(person => person.id === item.id);
    item.status = learner.assessment === 'Current' ? 'Issued' : 'Not issued';
    item.reason = learner.assessment === 'Current' ? 'Certificate available' : 'Assessment expired. Record renewal, then retry this learner.';
  }
  save();
}
function render() {
  settle(); role.value = state.role;
  document.querySelector('#permission').textContent = permissions[state.role];
  content.innerHTML = `<section><h2>Site safety — 6 September 2026</h2>
  <p>Attendance: ${state.approval ? 'Approved by attendance reviewer' : 'Awaiting reviewer approval'}. Selection is saved when you leave or reload.</p>
  <table><caption>Learners and prerequisites</caption><thead><tr><th>Select</th><th>Learner</th><th>Attendance</th><th>Assessment</th></tr></thead><tbody>
  ${state.learners.map(person => `<tr><td><input type="checkbox" aria-label="Select ${person.name}" data-select="${person.id}" ${state.selected.includes(person.id) ? 'checked' : ''} ${state.role !== 'coordinator' || state.job ? 'disabled' : ''}></td><td>${person.name}</td><td>${person.attendance}</td><td>${person.assessment}</td></tr>`).join('')}
  </tbody></table>
  <p>Absent learners are not eligible. Approval is invalidated if the selection changes.</p>
  <button id="approve" ${state.role !== 'reviewer' || state.approval ? 'disabled' : ''}>Approve attendance</button>
  <button id="request" ${state.role !== 'coordinator' || !state.approval || state.job ? 'disabled' : ''}>Request certificates</button></section>
  ${state.job ? `<section><h2>Certificate request</h2><p>Request ${state.job.id} — ${state.job.items.some(item => item.status === 'Pending') ? 'Processing' : 'Complete'}</p>
  <p>Requested learners: ${state.job.items.length}</p><button id="refresh">Refresh results</button>
  <table><caption>Individual results</caption><thead><tr><th>Learner</th><th>Result</th><th>Next step</th></tr></thead><tbody>
  ${state.job.items.map(item => `<tr><td>${state.learners.find(person => person.id === item.id).name}</td><td>${item.status}</td><td>${item.reason || 'Check again shortly'}</td></tr>`).join('')}</tbody></table>
  <button id="export">Download completion register</button>
  <p>The register is used in team reviews to identify who holds a certificate.</p></section>` : ''}
  ${state.role === 'coordinator' ? `<section><h2>Assessment renewal</h2><p>Record a renewal only when a learner has passed the replacement assessment.</p>
  <button id="renew">Record Sam Lee's assessment renewal</button>
  ${state.job ? '<button id="retry">Retry learners without certificates</button>' : ''}</section>` : ''}`;
  content.querySelectorAll('[data-select]').forEach(input => input.addEventListener('change', () => {
    state.selected = input.checked ? [...state.selected, input.dataset.select] : state.selected.filter(id => id !== input.dataset.select);
    state.approval = false; save(); render();
  }));
  document.querySelector('#approve').addEventListener('click', () => {
    if (!state.selected.length || state.selected.some(id => state.learners.find(person => person.id === id).attendance !== 'Present')) { say('Select at least one learner. All selected learners must have attended. Ask the coordinator to correct the selection.'); return; }
    state.approval = true; save(); render(); say('Attendance approved. A coordinator can now request certificates.');
  });
  document.querySelector('#request').addEventListener('click', () => {
    state.job = { id: 'CR-101', readyAt: Date.now() + 1200, items: state.selected.map(id => ({ id, status: 'Pending' })) };
    save(); render(); say('Certificates ready.');
  });
  document.querySelector('#refresh')?.addEventListener('click', () => { render(); say('Results refreshed.'); });
  document.querySelector('#renew')?.addEventListener('click', () => { state.learners.find(person => person.id === 'L-12').assessment = 'Current'; save(); render(); say('Assessment renewal recorded.'); });
  document.querySelector('#retry')?.addEventListener('click', () => {
    settle(); state.job.items.forEach(item => { if (item.status === 'Not issued') { item.status = 'Pending'; delete item.reason; } });
    state.job.readyAt = Date.now() + 1200; save(); render(); say('Retry accepted. Check individual results.');
  });
  document.querySelector('#export')?.addEventListener('click', () => {
    settle();
    const csv = 'learner,certificate\n' + state.job.items.map(item => `${state.learners.find(person => person.id === item.id).name},Issued`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'completion-register.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); say('Completion register downloaded.');
  });
}
role.addEventListener('change', () => { state.role = role.value; save(); render(); notice.hidden = true; });
document.querySelector('#reset').addEventListener('click', () => { state = initial(); save(); render(); say('Sandbox reset.'); });
render();
