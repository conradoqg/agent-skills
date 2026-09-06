#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [command = 'help', id, ...args] = process.argv.slice(2);
const file = resolve('.library-state.json');
const initial = () => ({ loans: [
  { id: 'L10', title: 'Field Guide', edition: '2021', due: '2026-09-12', renewable: true },
  { id: 'L20', title: 'Field Guide', edition: '2025', due: '2026-09-08', renewable: true },
  { id: 'L30', title: 'Local Atlas', edition: '2024', due: '2026-09-07', renewable: false, reason: 'Reference-desk loan; reserved for local consultation' }
], receipts: [] });
let state;
try { state = JSON.parse(await readFile(file, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; state = initial(); }
const save = () => writeFile(file, JSON.stringify(state, null, 2));
if (command === 'reset') { state = initial(); await save(); console.log('This library sandbox was reset.'); }
else if (command === 'help') console.log(`Branch Library — member loans\nCommands:\n  loans                  List your loan IDs, editions and due dates\n  renew <loanId>          Extend an eligible loan by 7 calendar days\n  receipt <receiptId>     View the confirmation of a renewal\n  undo <receiptId> --role librarian  Staff reversal of a mistaken renewal\n  reset                  Reset this local sandbox\nAll dates are ISO calendar dates. Reference-desk loans cannot be renewed.`);
else if (command === 'loans') console.log(JSON.stringify({ loans: state.loans }, null, 2));
else if (command === 'renew') {
  const requested = state.loans.find(loan => loan.id === id);
  if (!requested) { console.error('Loan not found. Run loans to find its ID.'); process.exitCode = 2; }
  else if (!requested.renewable) { console.error(`Cannot renew ${id}: ${requested.reason}. Return it by ${requested.due}.`); process.exitCode = 3; }
  else {
    const before = structuredClone(state.loans);
    const date = new Date(`${requested.due}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 7);
    const due = date.toISOString().slice(0, 10);
    const updated = state.loans.find(loan => loan.title === requested.title);
    updated.due = due;
    const receipt = { id: `R${state.receipts.length + 1}`, loanId: requested.id, edition: requested.edition, due, before, reversed: false };
    state.receipts.push(receipt); await save();
    console.log(JSON.stringify({ receipt: receipt.id, message: 'Loan renewed', loanId: requested.id, edition: requested.edition, due }));
  }
} else if (command === 'receipt') {
  const receipt = state.receipts.find(entry => entry.id === id);
  if (!receipt) { console.error('Receipt not found. Use the receipt ID returned by renew.'); process.exitCode = 2; }
  else console.log(JSON.stringify({ id: receipt.id, loanId: receipt.loanId, edition: receipt.edition, due: receipt.due, reversed: receipt.reversed }));
} else if (command === 'undo') {
  const receipt = state.receipts.find(entry => entry.id === id);
  const roleFlag = args.indexOf('--role');
  if (roleFlag < 0 || args[roleFlag + 1] !== 'librarian') { console.error('A librarian must reverse a renewal. Share the receipt ID with library staff.'); process.exitCode = 4; }
  else if (!receipt || receipt.reversed) { console.error('Receipt not found or already reversed.'); process.exitCode = 2; }
  else if (receipt !== state.receipts.at(-1)) { console.error('Only the latest renewal can be reversed in this sandbox. Contact library staff for earlier receipts.'); process.exitCode = 5; }
  else { state.loans = receipt.before; receipt.reversed = true; await save(); console.log(`Reversed ${receipt.id}; previous due dates restored. Check loans.`); }
} else { console.error('Unknown command. Run help for supported actions.'); process.exitCode = 2; }
