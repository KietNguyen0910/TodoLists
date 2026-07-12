export const OUTCOME_PHASES = [
  {
    title: 'Phase 1: Job Setup & Data Ingestion (All Entity Types)',
    items: [
      'Create Client files in cloud accounting software (Xero / QuickBooks / MYOB)',
      'Set up formal Jobs Folder structure inside local server or cloud drive',
      'Perform Prefill via ATO Tax Agent Portal',
      'Validate client basic registry details via ATO Portal',
      'Download raw client bank statements from all active accounts',
      'Convert raw external bank statements into clean CSV formatting',
      'Import formatted CSV bank data into the software ledger',
      'Summarize volumes of external receipts and electronic invoices',
      'Record manual historical cash receipts from digital folders',
      'Record manual business cash transaction summaries',
      'Verify all external data sources are completely ingested before matching',
    ],
  },
  {
    title: 'Phase 2: Bookkeeping, Matching & Ledger Reconciliation',
    items: [
      'Reconcile main bank account transaction volume feeds line-by-line',
      'Cross-verify specific individual internal bank accounts to prevent errors',
      'Isolate ledger entries to avoid incorrect cross-posting bugs',
      'Cross-check Source Transaction Reports against active bank ledgers',
      'Match electronic payment gateway summaries (Stripe / PayPal / Square)',
      'Reconcile Intercompany loan accounts against sister entity ledgers',
      'Verify closing bank ledger balance matches actual physical statement balance',
    ],
  },
  {
    title: 'Phase 3: Prior-Year Alignment & Structural Schedules',
    items: [
      'Record prior-year closing Balance Sheet figures as per signed reports',
      'Lock the opening balances in the software to match prior-year data',
      'Reconcile the opening Fixed Assets schedule with prior-year reports',
      'Adjust historical depreciation data in the asset ledger',
      'Add current-year asset additions into the Fixed Asset Register',
      'Add current-year asset disposals into the Fixed Asset Register',
      'Execute thorough Business Schedule reviews to tie all core P&L codes',
      'Reconcile Hire Purchase or Chattel Mortgage liabilities to amortization schedules',
      'Reconcile Director Loan accounts against formal corporate minutes',
    ],
  },
  {
    title: 'Phase 4: Payroll Setup & Compliance Processing',
    items: [
      'Set up new employee files in the Payroll module using onboarding forms',
      'Process live active Payruns based on authorized timesheet data',
      'Run final payroll tax calculations',
      'Run quarterly superannuation calculations',
      'Reconcile the overarching Wage Payable clearing account',
      'Perform targeted audits on Superannuation details',
      'Calculate strict Superannuation Guarantee thresholds for the quarter',
      'Cross-check Single Touch Payroll (STP) finalization reports against the general ledger',
    ],
  },
  {
    title: 'Phase 5: Tax Adjustments & Entity-Specific Schedules',
    items: [
      'Extract current-year Net Profit figure from the preliminary P&L',
      'Calculate basic Accounting-to-Tax reconciliation adjustments',
      'Add back non-deductible entertainment expenses',
      'Add back private usage portions of motor vehicle expenses',
      'Apply Division 7A loan interest adjustments for Company entities',
      'Process Trust Distribution resolutions based on trustee minutes',
      'Reconcile Partner Share of Profits for Partnership entities',
      'Apply Sole Trader non-commercial loss rules if applicable',
      'Reconcile annual BAS/IAS lodgements against Net GST accounts',
    ],
  },
  {
    title: 'Phase 6: Working Papers & First Draft Pack',
    items: [
      'Compile the first master draft of the Working Paper Package (WPP Lead Schedules)',
      'Cross-reference every balance sheet line item to supporting workpapers',
      'Generate the first draft of the Financial Statements (P&L and Balance Sheet)',
      'Generate the first draft of the Income Tax Return in the tax software',
      'Consolidate outstanding checklist issues and missing data points',
      'Prepare the formal unified Information Request email for the client',
    ],
  },
];

export function getOutcomeProgress(outcomes = []) {
  const selected = Array.isArray(outcomes) ? outcomes : outcomes ? [outcomes] : [];
  const highestPhaseIndex = OUTCOME_PHASES.reduce((highest, phase, index) => (
    phase.items.some((item) => selected.includes(item)) ? Math.max(highest, index) : highest
  ), -1);
  const completedPhases = highestPhaseIndex + 1;
  const totalPhases = OUTCOME_PHASES.length;
  const percent = totalPhases ? Math.round((completedPhases / totalPhases) * 100) : 0;

  return {
    completedPhases,
    totalPhases,
    percent,
    label: `${completedPhases}/${totalPhases} phases (${percent}%)`,
  };
}
