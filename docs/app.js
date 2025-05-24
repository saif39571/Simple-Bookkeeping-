document.addEventListener('DOMContentLoaded', () => {
    // --- DATA STORAGE ---
    let chartOfAccounts = loadCOA() || [ // Example initial COA
        { accNum: "101", name: "Cash", type: "Asset", normalBalance: "Debit", balance: 0 },
        { accNum: "112", name: "Accounts Receivable", type: "Asset", normalBalance: "Debit", balance: 0 },
        { accNum: "201", name: "Accounts Payable", type: "Liability", normalBalance: "Credit", balance: 0 },
        { accNum: "301", name: "Owner's Capital", type: "Equity", normalBalance: "Credit", balance: 0 },
        { accNum: "306", name: "Owner's Drawings", type: "Equity", normalBalance: "Debit", balance: 0 },
        { accNum: "400", name: "Service Revenue", type: "Revenue", normalBalance: "Credit", balance: 0 },
        { accNum: "610", name: "Rent Expense", type: "Expense", normalBalance: "Debit", balance: 0 },
        { accNum: "726", name: "Salaries Expense", type: "Expense", normalBalance: "Debit", balance: 0 },
    ];
    let generalJournal = loadJournal() || []; // Array of journal entry objects
    let generalLedger = {}; // Object: { accNum: [transactions], ... }

    // --- DOM ELEMENTS ---
    const sections = document.querySelectorAll('main section');
    const coaSection = document.getElementById('coaSection');
    const journalEntrySection = document.getElementById('journalEntrySection');
    const generalJournalSection = document.getElementById('generalJournalSection');
    const ledgerSection = document.getElementById('ledgerSection');
    const reportsSection = document.getElementById('reportsSection');

    const formAddAccount = document.getElementById('formAddAccount');
    const tableCOABody = document.getElementById('tableCOA').querySelector('tbody');

    const formJournalEntry = document.getElementById('formJournalEntry');
    const journalLinesContainer = document.getElementById('journalLines');
    const btnAddLine = document.getElementById('btnAddLine');
    const totalDebitsSpan = document.getElementById('totalDebits');
    const totalCreditsSpan = document.getElementById('totalCredits');
    const tableGeneralJournalBody = document.getElementById('tableGeneralJournal').querySelector('tbody');

    const selectLedgerAccount = document.getElementById('selectLedgerAccount');
    const ledgerAccountDetailDiv = document.getElementById('ledgerAccountDetail');

    const reportOutputArea = document.getElementById('reportOutputArea');

    // --- INITIALIZATION ---
    updateCOATable();
    populateAccountDropdowns();
    initializeLedger();

    // --- NAVIGATION / SECTION VISIBILITY ---
    function showSection(sectionToShow) {
        sections.forEach(section => section.classList.add('hidden'));
        if (sectionToShow) {
            sectionToShow.classList.remove('hidden');
        }
    }

    document.getElementById('btnShowCOA').addEventListener('click', () => {
        updateCOATable(); // Refresh COA table every time it's shown
        showSection(coaSection);
    });
    document.getElementById('btnShowJournalEntry').addEventListener('click', () => {
        resetJournalEntryForm();
        showSection(journalEntrySection);
    });
    document.getElementById('btnShowGeneralJournal').addEventListener('click', () => {
        renderGeneralJournal();
        showSection(generalJournalSection);
    });
    document.getElementById('btnShowLedger').addEventListener('click', () => {
        populateLedgerAccountSelect();
        ledgerAccountDetailDiv.innerHTML = ''; // Clear previous detail
        showSection(ledgerSection);
    });
    document.getElementById('btnShowReports').addEventListener('click', () => {
        reportOutputArea.innerHTML = ''; // Clear previous report
        showSection(reportsSection);
    });


    // --- CHART OF ACCOUNTS LOGIC ---
    formAddAccount.addEventListener('submit', (e) => {
        e.preventDefault();
        const accNum = document.getElementById('accNum').value.trim();
        const accName = document.getElementById('accName').value.trim();
        const accType = document.getElementById('accType').value;
        const normalBalance = document.getElementById('normalBalance').value;

        if (chartOfAccounts.find(acc => acc.accNum === accNum)) {
            alert('Account number already exists!');
            return;
        }
        chartOfAccounts.push({ accNum, name: accName, type: accType, normalBalance, balance: 0 });
        generalLedger[accNum] = []; // Initialize in ledger
        updateCOATable();
        populateAccountDropdowns(); // Update dropdowns everywhere
        formAddAccount.reset();
        saveCOA();
    });

    function updateCOATable() {
        tableCOABody.innerHTML = ''; // Clear existing rows
        chartOfAccounts.sort((a,b) => a.accNum.localeCompare(b.accNum)).forEach(acc => {
            const row = tableCOABody.insertRow();
            row.insertCell().textContent = acc.accNum;
            row.insertCell().textContent = acc.name;
            row.insertCell().textContent = acc.type;
            row.insertCell().textContent = acc.normalBalance;
            row.insertCell().textContent = formatCurrency(acc.balance);
        });
    }

    function populateAccountDropdowns() {
        const selects = document.querySelectorAll('.account-select');
        const optionsHTML = '<option value="">--Select Account--</option>' +
            chartOfAccounts
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(acc => `<option value="${acc.accNum}">${acc.accNum} - ${acc.name}</option>`).join('');

        selects.forEach(select => {
            const currentValue = select.value; // Preserve selection if possible
            select.innerHTML = optionsHTML;
            select.value = currentValue; // Attempt to restore selection
        });
        populateLedgerAccountSelect();
    }

    function populateLedgerAccountSelect() {
        const optionsHTML = '<option value="">--Select Account--</option>' +
            chartOfAccounts
                .sort((a,b) => a.accNum.localeCompare(b.accNum))
                .map(acc => `<option value="${acc.accNum}">${acc.accNum} - ${acc.name}</option>`).join('');
        selectLedgerAccount.innerHTML = optionsHTML;
    }


    // --- JOURNAL ENTRY LOGIC ---
    btnAddLine.addEventListener('click', addJournalLine);

    function addJournalLine() {
        const lineDiv = document.createElement('div');
        lineDiv.classList.add('journal-line');
        lineDiv.innerHTML = `
            <select class="account-select" required>
                <option value="">--Select Account--</option>
                ${chartOfAccounts.sort((a,b) => a.name.localeCompare(b.name)).map(acc => `<option value="${acc.accNum}">${acc.accNum} - ${acc.name}</option>`).join('')}
            </select>
            <input type="number" class="debit-amount" placeholder="Debit" min="0" step="0.01">
            <input type="number" class="credit-amount" placeholder="Credit" min="0" step="0.01">
            <button type="button" class="remove-line-btn">X</button>
        `;
        journalLinesContainer.appendChild(lineDiv);
        lineDiv.querySelector('.remove-line-btn').addEventListener('click', function() {
            this.parentElement.remove();
            updateJournalTotals();
        });
        // Add event listeners for debit/credit inputs to update totals
        lineDiv.querySelectorAll('.debit-amount, .credit-amount').forEach(input => {
            input.addEventListener('input', updateJournalTotals);
        });
    }

    function updateJournalTotals() {
        let debits = 0;
        let credits = 0;
        document.querySelectorAll('#journalLines .journal-line').forEach(line => {
            const debitInput = line.querySelector('.debit-amount');
            const creditInput = line.querySelector('.credit-amount');
            debits += parseFloat(debitInput.value) || 0;
            credits += parseFloat(creditInput.value) || 0;
        });
        totalDebitsSpan.textContent = formatCurrency(debits);
        totalCreditsSpan.textContent = formatCurrency(credits);
    }
    // Initial call to set up listeners for the first line
    document.querySelectorAll('#journalLines .journal-line .debit-amount, #journalLines .journal-line .credit-amount').forEach(input => {
        input.addEventListener('input', updateJournalTotals);
    });


    formJournalEntry.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('entryDate').value;
        const description = document.getElementById('entryDescription').value;
        const entryType = document.getElementById('entryType').value;
        const lines = [];
        let totalDebits = 0;
        let totalCredits = 0;

        document.querySelectorAll('#journalLines .journal-line').forEach(line => {
            const accountId = line.querySelector('.account-select').value;
            const debit = parseFloat(line.querySelector('.debit-amount').value) || 0;
            const credit = parseFloat(line.querySelector('.credit-amount').value) || 0;

            if (!accountId || (debit === 0 && credit === 0)) return; // Skip empty lines
            if (debit > 0 && credit > 0) {
                alert("An account line cannot have both debit and credit amounts.");
                throw new Error("Invalid line"); // Stop processing
            }
            if (debit < 0 || credit < 0) {
                alert("Debit/Credit amounts cannot be negative.");
                throw new Error("Invalid amount");
            }

            lines.push({ accountId, debit, credit });
            totalDebits += debit;
            totalCredits += credit;
        });

        if (lines.length < 2) {
            alert('A journal entry must affect at least two accounts.');
            return;
        }
        if (totalDebits !== totalCredits) {
            alert('Total debits must equal total credits.');
            return;
        }
        if (totalDebits === 0) {
            alert('Journal entry cannot have zero total debits and credits.');
            return;
        }

        const entryId = generalJournal.length + 1;
        const newEntry = { entryId, date, description, type: entryType, details: lines };
        generalJournal.push(newEntry);
        postToLedger(newEntry);
        updateCOATable(); // Balances in COA might have changed
        alert('Journal entry posted!');
        resetJournalEntryForm();
        saveJournal();
        saveCOA(); // Balances changed
    });

    function resetJournalEntryForm() {
        formJournalEntry.reset();
        // Remove all but the first journal line
        const lines = journalLinesContainer.querySelectorAll('.journal-line');
        for (let i = lines.length - 1; i > 0; i--) {
            lines[i].remove();
        }
        // Reset the first line
        const firstLine = journalLinesContainer.querySelector('.journal-line');
        if (firstLine) {
            firstLine.querySelector('.account-select').value = "";
            firstLine.querySelector('.debit-amount').value = "";
            firstLine.querySelector('.credit-amount').value = "";
        }
        updateJournalTotals();
    }


    // --- GENERAL LEDGER LOGIC ---
    function initializeLedger() {
        generalLedger = {}; // Reset
        chartOfAccounts.forEach(acc => {
            generalLedger[acc.accNum] = [];
        });
        // Repopulate ledger from journal (important if loading from localStorage)
        generalJournal.forEach(entry => postToLedger(entry, true)); // true to skip COA balance update for initial load
        calculateAllAccountBalancesFromLedger(); // Calculate COA balances based on ledger
        updateCOATable();
    }

    function postToLedger(journalEntry, isInitialLoad = false) {
        journalEntry.details.forEach(detail => {
            const account = chartOfAccounts.find(acc => acc.accNum === detail.accountId);
            if (!account) {
                console.error(`Account ${detail.accountId} not found in COA for posting.`);
                return;
            }

            const ledgerTransaction = {
                date: journalEntry.date,
                description: journalEntry.description,
                journalEntryId: journalEntry.entryId,
                debit: detail.debit,
                credit: detail.credit,
                balance: 0 // Will be calculated when displaying ledger account
            };
            if (!generalLedger[detail.accountId]) {
                generalLedger[detail.accountId] = [];
            }
            generalLedger[detail.accountId].push(ledgerTransaction);

            if (!isInitialLoad) { // Only update COA balance if not initial load
                 // Recalculate balance for this specific account
                 recalculateAccountBalance(detail.accountId);
            }
        });
    }

    function recalculateAccountBalance(accountId) {
        const account = chartOfAccounts.find(acc => acc.accNum === accountId);
        if (!account) return;

        let balance = 0;
        const transactions = generalLedger[accountId] || [];

        transactions.forEach(tx => {
            if (account.normalBalance === 'Debit') {
                balance += tx.debit;
                balance -= tx.credit;
            } else { // Normal Credit
                balance -= tx.debit;
                balance += tx.credit;
            }
        });
        account.balance = balance;
    }

    function calculateAllAccountBalancesFromLedger() {
        chartOfAccounts.forEach(acc => {
            recalculateAccountBalance(acc.accNum);
        });
    }

    selectLedgerAccount.addEventListener('change', (e) => {
        const accountId = e.target.value;
        if (accountId) {
            renderLedgerAccount(accountId);
        } else {
            ledgerAccountDetailDiv.innerHTML = '';
        }
    });

    function renderLedgerAccount(accountId) {
        const account = chartOfAccounts.find(acc => acc.accNum === accountId);
        if (!account) {
            ledgerAccountDetailDiv.innerHTML = '<p>Account not found.</p>';
            return;
        }

        const transactions = generalLedger[accountId] || [];
        let runningBalance = 0;

        let html = `<h3>${account.accNum} - ${account.name}</h3>`;
        html += `<table><thead><tr><th>Date</th><th>Description</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>`;

        transactions.sort((a,b) => new Date(a.date) - new Date(b.date) || a.journalEntryId - b.journalEntryId).forEach(tx => {
            if (account.normalBalance === 'Debit') {
                runningBalance += tx.debit;
                runningBalance -= tx.credit;
            } else { // Normal Credit
                runningBalance -= tx.debit;
                runningBalance += tx.credit;
            }
            tx.balance = runningBalance; // Store running balance with transaction for display

            html += `
                <tr>
                    <td>${tx.date}</td>
                    <td>${tx.description}</td>
                    <td>J${tx.journalEntryId}</td>
                    <td>${tx.debit > 0 ? formatCurrency(tx.debit) : ''}</td>
                    <td>${tx.credit > 0 ? formatCurrency(tx.credit) : ''}</td>
                    <td>${formatCurrency(runningBalance)} ${account.normalBalance.charAt(0)}r</td>
                </tr>`;
        });
        html += `</tbody></table>`;
        ledgerAccountDetailDiv.innerHTML = html;
    }


    // --- GENERAL JOURNAL VIEW ---
    function renderGeneralJournal() {
        tableGeneralJournalBody.innerHTML = '';
        generalJournal.forEach(entry => {
            const firstLine = entry.details[0];
            const accountName = chartOfAccounts.find(acc => acc.accNum === firstLine.accountId)?.name || 'N/A';

            let row = tableGeneralJournalBody.insertRow();
            row.insertCell().textContent = entry.date;
            let descCell = row.insertCell();
            descCell.innerHTML = `<strong>${accountName}</strong><br><small>(${entry.description})</small>`; // Main account for first line
            row.insertCell().textContent = `J${entry.entryId}`;
            row.insertCell().textContent = firstLine.debit > 0 ? formatCurrency(firstLine.debit) : '';
            row.insertCell().textContent = firstLine.credit > 0 ? formatCurrency(firstLine.credit) : '';

            // Subsequent lines for the same entry
            for (let i = 1; i < entry.details.length; i++) {
                const detail = entry.details[i];
                const detailAccountName = chartOfAccounts.find(acc => acc.accNum === detail.accountId)?.name || 'N/A';
                row = tableGeneralJournalBody.insertRow();
                row.insertCell(); // Empty date
                let accountCell = row.insertCell();
                accountCell.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;${detailAccountName}`; // Indented account name
                row.insertCell(); // Empty ref
                row.insertCell().textContent = detail.debit > 0 ? formatCurrency(detail.debit) : '';
                row.insertCell().textContent = detail.credit > 0 ? formatCurrency(detail.credit) : '';
            }
            // Add a separator line (optional)
            let separatorRow = tableGeneralJournalBody.insertRow();
            let separatorCell = separatorRow.insertCell();
            separatorCell.colSpan = 5;
            separatorCell.innerHTML = `<small><em>${entry.type} Entry</em></small><hr style='margin: 2px 0;'>`;
        });
    }

    // --- FINANCIAL REPORTS ---
    // (These will be complex. Start with Trial Balance)

    document.getElementById('btnGenUnadjustedTB').addEventListener('click', () => generateTrialBalance('Unadjusted'));
    document.getElementById('btnGenAdjustedTB').addEventListener('click', () => generateTrialBalance('Adjusted'));
    document.getElementById('btnGenPostClosingTB').addEventListener('click', () => generateTrialBalance('Post-Closing'));


    function generateTrialBalance(type) {
        // For "Adjusted" and "Post-Closing", you'd typically filter entries
        // or work from a state *after* those entries are posted.
        // For simplicity now, we'll use current COA balances.
        // You'll need to mark entries as "Adjusting" or "Closing" and factor that in.

        // Ensure all balances are fresh from the ledger before generating any report
        calculateAllAccountBalancesFromLedger();
        updateCOATable(); // Visually update COA too

        let reportHTML = `<h3>${type} Trial Balance</h3>`;
        reportHTML += `<p>As of: ${document.getElementById('reportPeriodEnd').value || new Date().toLocaleDateString()}</p>`;
        reportHTML += `<table><thead><tr><th>Account Name</th><th>Debit</th><th>Credit</th></tr></thead><tbody>`;

        let totalDebits = 0;
        let totalCredits = 0;

        const accountsForTB = chartOfAccounts.filter(acc => {
            if (type === 'Post-Closing') {
                return ['Asset', 'Liability', 'Equity'].includes(acc.type) && acc.name !== "Owner's Drawings"; // Simplified
            }
            return true; // For Unadjusted and Adjusted (assuming adjustments are already in COA balances)
        });


        accountsForTB.sort((a,b) => a.accNum.localeCompare(b.accNum)).forEach(acc => {
            // Skip accounts with zero balance for cleaner trial balance (optional)
            // if (acc.balance === 0) return;

            let debitAmount = '';
            let creditAmount = '';

            if (acc.normalBalance === 'Debit') {
                if (acc.balance >= 0) debitAmount = formatCurrency(acc.balance);
                else creditAmount = formatCurrency(Math.abs(acc.balance)); // Abnormal balance
            } else { // Normal Credit
                if (acc.balance >= 0) creditAmount = formatCurrency(acc.balance);
                else debitAmount = formatCurrency(Math.abs(acc.balance)); // Abnormal balance
            }

            // For actual summing, use the raw balance and its nature
            if ((acc.normalBalance === 'Debit' && acc.balance >= 0) || (acc.normalBalance === 'Credit' && acc.balance < 0)) {
                 totalDebits += Math.abs(acc.balance);
            } else {
                 totalCredits += Math.abs(acc.balance);
            }

            reportHTML += `<tr><td>${acc.accNum} - ${acc.name}</td><td>${debitAmount}</td><td>${creditAmount}</td></tr>`;
        });

        reportHTML += `</tbody><tfoot><tr><td><strong>Totals</strong></td><td><strong>${formatCurrency(totalDebits)}</strong></td><td><strong>${formatCurrency(totalCredits)}</strong></td></tr></tfoot></table>`;
        if (Math.abs(totalDebits - totalCredits) > 0.001) { // Check for float precision
            reportHTML += `<p style="color:red;"><strong>Trial Balance does not balance!</strong></p>`;
        }
        reportOutputArea.innerHTML = reportHTML;
    }


    document.getElementById('btnGenIncomeStatement').addEventListener('click', generateIncomeStatement);
    function generateIncomeStatement() {
        calculateAllAccountBalancesFromLedger(); // Ensure fresh balances

        const reportDate = document.getElementById('reportPeriodEnd').value || new Date().toLocaleDateString();
        let totalRevenue = 0;
        let totalExpenses = 0;
        let netIncome = 0;

        let reportHTML = `<h3>Income Statement</h3>`;
        reportHTML += `<p>For the Period Ended ${reportDate}</p>`;
        reportHTML += `<h4>Revenues</h4>`;
        chartOfAccounts.filter(acc => acc.type === 'Revenue').forEach(acc => {
            reportHTML += `<p>${acc.name}: ${formatCurrency(acc.balance)}</p>`;
            totalRevenue += acc.balance;
        });
        reportHTML += `<p><strong>Total Revenues: ${formatCurrency(totalRevenue)}</strong></p>`;

        reportHTML += `<h4>Expenses</h4>`;
        chartOfAccounts.filter(acc => acc.type === 'Expense').forEach(acc => {
            reportHTML += `<p>${acc.name}: ${formatCurrency(acc.balance)}</p>`;
            totalExpenses += acc.balance;
        });
        reportHTML += `<p><strong>Total Expenses: ${formatCurrency(totalExpenses)}</strong></p>`;

        netIncome = totalRevenue - totalExpenses;
        reportHTML += `<hr>`;
        reportHTML += `<p><strong>Net ${netIncome >= 0 ? 'Income' : 'Loss'}: ${formatCurrency(Math.abs(netIncome))}</strong></p>`;

        reportOutputArea.innerHTML = `<pre>${reportHTML.replace(/<p>/g, '').replace(/<\/p>/g, '\n').replace(/<h4>/g, '\n').replace(/<\/h4>/g, '\n').replace(/<hr>/g, '------------------').replace(/<strong>/g, '').replace(/<\/strong>/g, '')}</pre>`; // Basic preformatted display
        return netIncome; // Return for use in Owner's Equity Statement
    }

    document.getElementById('btnGenOwnersEquity').addEventListener('click', generateOwnersEquityStatement);
    function generateOwnersEquityStatement() {
        calculateAllAccountBalancesFromLedger(); // Ensure fresh balances

        // For a real system, "Beginning Capital" would come from the prior period's ending capital.
        // For this practice tool, we might need to prompt or use a default.
        const beginningCapitalInput = prompt("Enter Beginning Owner's Capital (e.g., from previous period or initial investment):", "0");
        let beginningCapital = parseFloat(beginningCapitalInput) || 0;

        const capitalAccount = chartOfAccounts.find(acc => acc.accNum === "301"); // Assuming 301 is Owner's Capital
        const drawingsAccount = chartOfAccounts.find(acc => acc.accNum === "306"); // Assuming 306 is Owner's Drawings

        // This is simplified. "Owner Contributions" would be increases to capital *during the period*,
        // not the total capital balance. We'd need to analyze ledger transactions for the Capital account.
        // For now, we'll assume any increase beyond beginning capital (not from Net Income) is a contribution.
        // This is a major simplification for a client-side only app.
        let ownerContributions = 0; // Placeholder for now.
                                  // True contributions are journal entries directly to Capital.

        const netIncome = calculateNetIncomeForOE(); // Get current net income

        let ownerDrawings = drawingsAccount ? drawingsAccount.balance : 0;

        let endingCapital = beginningCapital + ownerContributions + netIncome - ownerDrawings;

        const reportDate = document.getElementById('reportPeriodEnd').value || new Date().toLocaleDateString();
        let reportHTML = `<h3>Owner's Equity Statement</h3>`;
        reportHTML += `<p>For the Period Ended ${reportDate}</p>`;
        reportHTML += `<p>Beginning Owner's Capital: ${formatCurrency(beginningCapital)}</p>`;
        reportHTML += `<p>Add: Owner Contributions: ${formatCurrency(ownerContributions)}</p>`;
        reportHTML += `<p>Add: Net Income: ${formatCurrency(netIncome)}</p>`;
        reportHTML += `<p>Less: Owner's Drawings: ${formatCurrency(ownerDrawings)}</p>`;
        reportHTML += `<hr>`;
        reportHTML += `<p><strong>Ending Owner's Capital: ${formatCurrency(endingCapital)}</strong></p>`;

        reportOutputArea.innerHTML = `<pre>${reportHTML.replace(/<p>/g, '').replace(/<\/p>/g, '\n').replace(/<hr>/g, '------------------').replace(/<strong>/g, '').replace(/<\/strong>/g, '')}</pre>`;
        return endingCapital; // Return for use in Balance Sheet
    }

    function calculateNetIncomeForOE() {
        // Re-calculate just the net income part for OE statement.
        let totalRevenue = 0;
        let totalExpenses = 0;
        chartOfAccounts.filter(acc => acc.type === 'Revenue').forEach(acc => totalRevenue += acc.balance);
        chartOfAccounts.filter(acc => acc.type === 'Expense').forEach(acc => totalExpenses += acc.balance);
        return totalRevenue - totalExpenses;
    }

    document.getElementById('btnGenBalanceSheet').addEventListener('click', generateBalanceSheet);
    function generateBalanceSheet() {
        calculateAllAccountBalancesFromLedger(); // Ensure fresh balances

        const endingCapital = calculateEndingCapitalForBS(); // Get current ending capital
        const reportDate = document.getElementById('reportPeriodEnd').value || new Date().toLocaleDateString();

        let totalAssets = 0;
        let totalLiabilities = 0;
        // Owner's Equity is the 'endingCapital' calculated

        let reportHTML = `<h3>Balance Sheet</h3>`;
        reportHTML += `<p>As of ${reportDate}</p>`;

        reportHTML += `<h4>Assets</h4>`;
        chartOfAccounts.filter(acc => acc.type === 'Asset').forEach(acc => {
            // Handle contra-assets like Accumulated Depreciation
            // If it's a credit-normal asset, it reduces total assets
            if (acc.normalBalance === 'Credit') { // e.g. Accumulated Depreciation
                 reportHTML += `<p>${acc.name}: (${formatCurrency(acc.balance)})</p>`; // Show as deduction
                 totalAssets -= acc.balance;
            } else {
                 reportHTML += `<p>${acc.name}: ${formatCurrency(acc.balance)}</p>`;
                 totalAssets += acc.balance;
            }
        });
        reportHTML += `<p><strong>Total Assets: ${formatCurrency(totalAssets)}</strong></p>`;

        reportHTML += `<h4>Liabilities</h4>`;
        chartOfAccounts.filter(acc => acc.type === 'Liability').forEach(acc => {
            reportHTML += `<p>${acc.name}: ${formatCurrency(acc.balance)}</p>`;
            totalLiabilities += acc.balance;
        });
        reportHTML += `<p><strong>Total Liabilities: ${formatCurrency(totalLiabilities)}</strong></p>`;

        reportHTML += `<h4>Owner's Equity</h4>`;
        reportHTML += `<p>Owner's Capital: ${formatCurrency(endingCapital)}</p>`;
        // No need to add endingCapital to a running total, it *is* the total OE for a sole proprietorship.

        let totalLiabilitiesAndEquity = totalLiabilities + endingCapital;

        reportHTML += `<hr>`;
        reportHTML += `<p><strong>Total Liabilities and Owner's Equity: ${formatCurrency(totalLiabilitiesAndEquity)}</strong></p>`;

        if (Math.abs(totalAssets - totalLiabilitiesAndEquity) > 0.001) {
             reportHTML += `<p style="color:red;"><strong>Balance Sheet does not balance! Assets: ${formatCurrency(totalAssets)}, L+OE: ${formatCurrency(totalLiabilitiesAndEquity)}</strong></p>`;
        }


        reportOutputArea.innerHTML = `<pre>${reportHTML.replace(/<p>/g, '').replace(/<\/p>/g, '\n').replace(/<h4>/g, '\n').replace(/<\/h4>/g, '\n').replace(/<hr>/g, '------------------').replace(/<strong>/g, '').replace(/<\/strong>/g, '')}</pre>`;
    }

    function calculateEndingCapitalForBS() {
        // Re-calculate ending capital for Balance Sheet.
        // This function would be similar to generateOwnersEquityStatement but just returns the value.
        // For simplicity, assuming generateOwnersEquityStatement was just run or its logic is duplicated.
        // A better way is to have generateOwnersEquityStatement store its result if needed by BS.
        // For now, let's re-calculate:
        const beginningCapitalInput = localStorage.getItem('beginningCapital') || "0"; // Try to get from a persistent spot or default
        let beginningCapital = parseFloat(beginningCapitalInput) || 0;
        const capitalAccount = chartOfAccounts.find(acc => acc.accNum === "301");
        const drawingsAccount = chartOfAccounts.find(acc => acc.accNum === "306");
        let ownerContributions = 0; // Needs proper calculation from journal
        const netIncome = calculateNetIncomeForOE();
        let ownerDrawings = drawingsAccount ? drawingsAccount.balance : 0;
        return beginningCapital + ownerContributions + netIncome - ownerDrawings;
    }


    // --- UTILITY FUNCTIONS ---
    function formatCurrency(amount) {
        return Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }

    // --- DATA PERSISTENCE (localStorage example) ---
    function saveCOA() {
        localStorage.setItem('bookkeepingCOA', JSON.stringify(chartOfAccounts));
    }
    function loadCOA() {
        const coaData = localStorage.getItem('bookkeepingCOA');
        return coaData ? JSON.parse(coaData) : null;
    }
    function saveJournal() {
        localStorage.setItem('bookkeepingJournal', JSON.stringify(generalJournal));
    }
    function loadJournal() {
        const journalData = localStorage.getItem('bookkeepingJournal');
        return journalData ? JSON.parse(journalData) : null;
    }

    // --- Make sure ledger is rebuilt on load ---
    if (loadJournal() || loadCOA()) { // If there's any saved data
        initializeLedger(); // This will populate ledger and then calculate COA balances
    }


    // Show COA by default on load
    showSection(coaSection);

}); // End DOMContentLoaded