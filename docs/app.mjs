import {
  auditAsbj34Lease,
  generateLeaseComplianceMarkdown,
} from './core/lease-engine.mjs';

const BAD_CONTRACT_SAMPLE = `・使用権資産計上せず全額オフバランス賃貸費用処理し、契約識別せず注記省略とする。
・少額300万超でも識別判定せず、保守料混在未配分かつ割引計算なしとする。`;

const GOOD_CONTRACT_SAMPLE = `・特定資産の識別判定により支配権と物理的区別を確認し、使用権資産とリース負債をオンバランス計上する。
・解約不能期間および延長オプションの合理的確実性を評価してリース期間を決定し、追加借入利子率(IBR)による割引現在価値を算定する。
・短期リース（12か月以内・購入オプションなし）および少額リース（新品300万円以下）の契約単位判定を厳格運用し、倉庫専用などの組込リース識別を購買申請時へ義務付ける。
・リース構成部分と保守料区分・共益費区分（非リース構成部分）を配分し、企業会計基準第34号の減価償却・加重平均割引率・満期分析を注記開示して計算根拠保存を徹底する。`;

const els = {
  org: document.getElementById('in-org'),
  contractName: document.getElementById('in-contract-name'),
  monthly: document.getElementById('in-monthly'),
  months: document.getElementById('in-months'),
  rate: document.getElementById('in-rate'),
  newval: document.getElementById('in-newval'),
  purchase: document.getElementById('in-purchase'),
  control: document.getElementById('in-control'),
  onbs: document.getElementById('in-onbs'),
  contract: document.getElementById('in-contract'),
  badge: document.getElementById('status-badge'),
  mScore: document.getElementById('m-score'),
  mPv: document.getElementById('m-pv'),
  mPl: document.getElementById('m-pl'),
  findingsList: document.getElementById('findings-list'),
  mdOutput: document.getElementById('md-output'),
  btnBad: document.getElementById('btn-sample-bad'),
  btnGood: document.getElementById('btn-sample-good'),
  btnAudit: document.getElementById('btn-audit'),
  btnCopyMd: document.getElementById('btn-copy-md'),
  btnDownloadMd: document.getElementById('btn-download-md'),
};

let latestMarkdown = '';

function renderAudit() {
  const result = auditAsbj34Lease(els.contract.value, {
    monthlyLeaseJpy: Number(els.monthly.value || 0),
    leaseTermMonths: Number(els.months.value || 0),
    annualDiscountRatePct: Number(els.rate.value || 0),
    underlyingNewValueJpy: Number(els.newval.value || 0),
    hasPurchaseOption: els.purchase.checked,
    controlsIdentifiedAsset: els.control.checked,
    alreadyOnBalanceSheet: els.onbs.checked,
  });

  const m = result.metrics;
  els.mScore.textContent = `${result.score} / 100点`;
  els.mPv.textContent = m.offBalanceOmissionRisk
    ? `未計上PV ${m.leaseLiabilityPvJpy.toLocaleString('en-US')}円 (NG)`
    : `${m.leaseLiabilityPvJpy.toLocaleString('en-US')}円`;
  els.mPl.textContent = `償却${m.year1DepreciationJpy.toLocaleString('en-US')}円 / 利息${m.year1InterestExpenseJpy.toLocaleString('en-US')}円`;

  els.badge.className = 'score-pill';
  if (result.status === 'pass') {
    els.badge.textContent = 'ASBJ第34号 適合 (PASS)';
    els.badge.classList.add('status-ready');
  } else if (result.status === 'warn') {
    els.badge.textContent = '一部補完推奨 (WARN)';
    els.badge.classList.add('status-review');
  } else {
    els.badge.textContent = '計上漏れ・監査指摘リスク (FAIL)';
    els.badge.classList.add('status-high');
  }

  els.findingsList.innerHTML = '';
  if (result.findings.length === 0) {
    const ok = document.createElement('div');
    ok.setAttribute('data-ui', 'finding-card');
    ok.className = 'sev-ok';
    ok.textContent = '全8要件（識別判定・リース期間・割引率IBR・短期/少額基準・組込リース・非リース分離・第34号注記）およびB/S計上判定を充足しています。';
    els.findingsList.appendChild(ok);
  } else {
    for (const f of result.findings) {
      const card = document.createElement('div');
      card.setAttribute('data-ui', 'finding-card');
      card.className = f.severity === 'HIGH' ? 'sev-high' : 'sev-medium';
      const head = document.createElement('div');
      head.style.fontWeight = '700';
      head.textContent = `[${f.id}] ${f.title} (${f.criterion})`;
      const desc = document.createElement('div');
      desc.textContent = `${f.detail} ／ 是正案: ${f.remediation}`;
      card.append(head, desc);
      els.findingsList.appendChild(card);
    }
  }

  latestMarkdown = generateLeaseComplianceMarkdown(result, {
    organizationName: els.org.value,
    contractName: els.contractName.value,
  });
  els.mdOutput.textContent = latestMarkdown;
}

els.btnBad.addEventListener('click', () => {
  els.monthly.value = '1200000';
  els.months.value = '36';
  els.rate.value = '1.8';
  els.newval.value = '180000000';
  els.purchase.checked = false;
  els.control.checked = true;
  els.onbs.checked = false;
  els.contract.value = BAD_CONTRACT_SAMPLE;
  renderAudit();
});

els.btnGood.addEventListener('click', () => {
  els.monthly.value = '1200000';
  els.months.value = '36';
  els.rate.value = '1.8';
  els.newval.value = '180000000';
  els.purchase.checked = false;
  els.control.checked = true;
  els.onbs.checked = true;
  els.contract.value = GOOD_CONTRACT_SAMPLE;
  renderAudit();
});

els.btnAudit.addEventListener('click', renderAudit);
els.btnCopyMd.addEventListener('click', async () => {
  await navigator.clipboard.writeText(latestMarkdown);
  els.btnCopyMd.textContent = 'コピー完了';
  setTimeout(() => {
    els.btnCopyMd.textContent = 'Markdownをコピー';
  }, 1500);
});
els.btnDownloadMd.addEventListener('click', () => {
  const blob = new Blob([latestMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leasegate-asbj34-certificate.md';
  a.click();
  URL.revokeObjectURL(url);
});

els.contract.value = BAD_CONTRACT_SAMPLE;
renderAudit();
