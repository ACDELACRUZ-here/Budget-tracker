const STORAGE_KEY = "SS_Transaction";
function createUID(prefix="id") {
    return prefix + "_" + Math.random().toString(36).substr(2,9);
}
function readStorage() {
    let data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function writeStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function T(sel) {
    return document.querySelector(sel);
}
function TAll(sel) {
    return document.querySelectorAll(sel);
}
function renderTransactionList() {
    const list = T("#transaction-list");
    if (!list) {
        return;
    }
    const items = readStorage();
    list.innerHTML = "";
    if (items.length === 0) {
        list.innerHTML = "<tr><td colspan='4'>No transactions found.</td></tr>";
        return;
    }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = items.map(item => {
        const isIncome = String(item.type || '').toLowerCase() === 'income';
        const amountClass = isIncome ? 'text-success' : 'text-danger';
        return `
            <tr>
                <td>
                    <span class="fw-bold">${item.category} - ${item.type}</span><br>
                    <span class="text-muted">${item.date}${item.note ? ' | ' + item.note : ''}</span>
                    ${item.essential ? ' <span class="badge bg-warning text-dark fw-bold">Essential</span>' : ''}
                </td>
                <td class="fw-bold ${amountClass}">
                    ${Number(item.amount || 0).toFixed(2)}
                </td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-primary me-2 edit-btn" data-id="${item.id}">Edit</button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    // Re-attach listeners (or switch to delegation)
    TAll(".edit-btn").forEach(btn => btn.addEventListener('click', onEditTransaction));
    TAll(".delete-btn").forEach(btn => btn.addEventListener('click', onDeleteTransaction));
}


function onSaveEdit(e) {
    e.preventDefault();
    const form = T('#edit-form');
    if (!form) return alert('Edit form not found');

    const id = form.elements && form.elements['edit-id'] ? form.elements['edit-id'].value : null;
    if (!id) return alert('No transaction id provided');

    const arr = readStorage();
    const index = arr.findIndex(item => item.id === id);
    if (index === -1) return alert('Transaction not found');

    arr[index] = {
        id,
        type: form.elements['edit-type'] ? form.elements['edit-type'].value : arr[index].type,
        amount: parseFloat(form.elements['edit-amount'] ? form.elements['edit-amount'].value : arr[index].amount) || 0,
        category: form.elements['edit-category'] ? form.elements['edit-category'].value : arr[index].category,
        date: form.elements['edit-date'] ? form.elements['edit-date'].value : arr[index].date,
        note: form.elements['edit-note'] ? form.elements['edit-note'].value : arr[index].note,
        essential: form.elements['edit-essential'] ? !!form.elements['edit-essential'].checked : !!arr[index].essential,
    };
    writeStorage(arr);
    renderTransactionList();
    renderChart();
    alert('Transaction updated successfully!');
    const modalEl = T('#editModal');
    if (modalEl && window.bootstrap && bootstrap.Modal) {
        const instance = bootstrap.Modal.getInstance(modalEl);
        if (instance) instance.hide();
    }
}
function renderChart() {
    const allTransactions = readStorage();

    // Calculate essential and non-essential expenses
    const expenses = allTransactions.filter(item => String(item.type || '').toLowerCase() === 'expense');
    const income = allTransactions.filter(item => String(item.type || '').toLowerCase() === 'income');

    const totalIncome = income.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const essentialExpenses = expenses.filter(item => item.essential).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const nonEssentialExpenses = expenses.filter(item => !item.essential).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const remaining = totalIncome - essentialExpenses - nonEssentialExpenses;

    const labels = ['Essential Expenses', 'Non-Essential Expenses', 'Remaining'];
    const data = [essentialExpenses, nonEssentialExpenses, Math.max(0, remaining)];

    const canvas = T("#expense-chart");
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext("2d");
    if (window._spendChart) {
        window._spendChart.data.labels = labels;
        window._spendChart.data.datasets[0].data = data;
        window._spendChart.update();
    } else {
        window._spendChart = new Chart(ctx, {
            type: "pie",
            data: {
                labels,
                datasets: [{
                    label: "Budget Breakdown",
                    data,
                    backgroundColor: ['#dc3545', '#ff9900', '#28a745']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top'}
                }
            }
        });
    }

    // Always update the financial summary spans
    const totalExpense = essentialExpenses + nonEssentialExpenses;
    const incomeEl = T("#total-income");
    const expenseEl = T("#total-expenses");
    const remainingEl = T("#remaining-amount");
    if (incomeEl) incomeEl.textContent = totalIncome.toFixed(2);
    if (expenseEl) expenseEl.textContent = totalExpense.toFixed(2);
    if (remainingEl) remainingEl.textContent = remaining.toFixed(2);
}
function onAddSubmit(e) {
    e.preventDefault();
    const form = e.target;

    // Validate required fields
    const type = form.elements['type'] ? form.elements['type'].value : '';
    const amount = form.elements['amount'] ? form.elements['amount'].value : '';
    const category = form.elements['category'] ? form.elements['category'].value : '';
    const date = form.elements['date'] ? form.elements['date'].value : '';

    if (!type || type === '') {
        alert('Please select a transaction type (Income or Expense)');
        return;
    }
    if (!amount || amount === '' || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
    }
    if (!category || category.trim() === '') {
        alert('Please enter a category');
        return;
    }
    if (!date || date === '') {
        alert('Please select a date');
        return;
    }

    // create a new transaction and save
    const tx = {
        id: createUID("tx"),
        type: type,
        amount: parseFloat(amount),
        category: category.trim(),
        date: date,
        note: form.elements['note'] ? form.elements['note'].value : '',
        essential: form.elements['essential'] ? form.elements['essential'].checked : false,
    };
    const items = readStorage();
    items.push(tx);
    writeStorage(items);
    renderTransactionList();
    renderChart();
    alert('Transaction added successfully!');
    // reset form
    if (typeof form.reset === 'function') form.reset();
}
function onEditTransaction(e) {
    e.preventDefault();
    // event may come from button inside row
    const btn = e.currentTarget || e.target;
    const id = btn.dataset ? btn.dataset.id : null;
    if (!id) return alert('Transaction id missing');
    const arr = readStorage();
    const index = arr.findIndex(item => item.id === id);
    if (index === -1) {
        return alert("Transaction not found");
    }
    const item = arr[index];
    // populate edit form (expected to exist in DOM)
    const editForm = T('#edit-form');
    if (editForm) {
        if (editForm.elements['edit-id']) editForm.elements['edit-id'].value = item.id;
        if (editForm.elements['edit-type']) editForm.elements['edit-type'].value = item.type;
        if (editForm.elements['edit-amount']) editForm.elements['edit-amount'].value = item.amount;
        if (editForm.elements['edit-category']) editForm.elements['edit-category'].value = item.category;
        if (editForm.elements['edit-date']) editForm.elements['edit-date'].value = item.date;
        if (editForm.elements['edit-note']) editForm.elements['edit-note'].value = item.note || '';
        if (editForm.elements['edit-essential']) editForm.elements['edit-essential'].checked = !!item.essential;
    }
    const modalEl = T('#editModal');
    if (modalEl && window.bootstrap && bootstrap.Modal) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}
function onDeleteTransaction(e) {
    e.preventDefault();
    const id = e.target.dataset.id;
    if (!confirm("delete transaction?")) {
        return;
    }
    let arr = readStorage();
    arr = arr.filter(item => item.id !== id);
    writeStorage(arr);
    renderTransactionList();
    renderChart();
}
function exportJson() {
    const data = readStorage();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaction.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function importJson(e) {
    const file = (e && e.target && e.target.files && e.target.files[0]) ? e.target.files[0] : (e && e.name ? e : null);
    if (!file) {
        return alert('No file provided for import.');
    }
    const reader = new FileReader();
    reader.onload = function() {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data)) {
                throw new Error("invalid data");
            }
            writeStorage(data);
            renderTransactionList();
            renderChart();
            alert("import successful");
        } catch (err) {
            alert("import failed: " + err.message);
        }
    };
    reader.readAsText(file);
}
function clear() {
    if (!confirm("Delete All Transactions?")) {
        return;
    }
    localStorage.removeItem(STORAGE_KEY);
    renderTransactionList();
    renderChart();
}
