/**
 * LEASEGATE（リース門）Core Engine
 * 新リース会計基準（企業会計基準第34号 / 2027年4月期〜強制適用）
 *  - 使用権資産（ROU Asset）＆ リース負債の割引現在価値（PV）算定・初年度利息/償却スケジュール
 *  - 短期リース免除（12か月以内・購入オプションなし）・少額資産免除（新品300万円以下）
 *  - 組込リース（倉庫・サーバー・専用車等）識別判定・非リース構成部分（保守料等）分離
 * ブラウザローカル監査エンジン（外部通信ゼロ）
 */

const PILLARS = [
  {
    id: 'identified_asset_control_check',
    title: '特定資産の識別 ＆ 借手による使用指図・経済的利益享受権の確認',
    criterion: '企業会計基準第34号（リースの識別判定）',
    weight: 14,
    severity: 'HIGH',
    pattern: /(?:特定資産|使用権資産|識別判定|支配権|物理的区別|代替権なし)/i,
    antiPattern: /(?:識別判定せず|識別判定省略|資産識別なし|使用権資産計上せず|オフバランス偽装|全額オフバランス賃貸費用処理)/i,
    detail: '資産が契約上・物理的に特定されており、供給者に実質的な代替権がないか（使用権資産の識別要件）の確認が抜けています。',
    remediation: '不動産・専用サーバー・ロジスティクス契約につき特定資産識別チェックシートを実施し支配権の有無を判定してください。',
  },
  {
    id: 'lease_term_extension_probability',
    title: '解約不能期間 ＋ 延長オプション行使確実期間を踏まえたリース期間決定',
    criterion: '企業会計基準第34号（リース期間の決定・自動更新契約の見積り）',
    weight: 14,
    severity: 'HIGH',
    pattern: /(?:リース期間|解約不能期間|延長オプション|経済的インセンティブ)/i,
    antiPattern: /(?:期間設定恣意|解約可能偽装|短期分割回避)/i,
    detail: '自動更新特約や内装造作の経済的耐用年数を踏まえ、延長オプション行使が合理的に確実かどうかの判定基準が明記されていません。',
    remediation: '解約ペナルティや移転コスト・経済的インセンティブを考慮したリース期間決定方針を規定化してください。',
  },
  {
    id: 'discount_rate_ib_rate_policy',
    title: '貸手の計算利子率 / 追加借入利子率（IBR）による割引現在価値算定',
    criterion: '企業会計基準第34号（リース負債の現在価値計算）',
    weight: 13,
    severity: 'HIGH',
    pattern: /(?:割引率|追加借入利子率|計算利子率|現在価値|IBR)/i,
    antiPattern: /(?:割引計算なし|無割引計上|割引率未設定)/i,
    detail: 'リース期間に応じた残存期間別の追加借入利子率（IBR）テーブルまたは計算利子率を適用した現在価値計算方針が欠落しています。',
    remediation: '格付・期間別IBRカーブ（月利換算含む）を経理規程に定め、毎期末の新規・条件変更案件へ一貫適用してください。',
  },
  {
    id: 'short_term_12m_no_purchase_opt',
    title: '短期リース免除（リース期間12か月以内 ＆ 購入オプションなし）基準',
    criterion: '企業会計基準適用指針第33号（短期リース実務上の便法）',
    weight: 12,
    severity: 'MEDIUM',
    pattern: /(?:短期リース|12か月以内|12ヶ月以内|購入オプションなし)/i,
    antiPattern: /(?:自動更新実質長期|短期要件違反)/i,
    detail: '短期リースの簡便的費用処理を選択する際、延長オプションを含めた実質期間12か月以内かつ購入オプション非付帯の確認が必要です。',
    remediation: '契約更新見込みが実質1年を超える物件は短期免除から除外し資産種別ごとに首尾一貫して適用してください。',
  },
  {
    id: 'low_value_3m_yen_threshold',
    title: '少額リース免除（新品価値300万円以下 / 5,000ドル基準）契約単位判定',
    criterion: '企業会計基準適用指針第33号（少額リース実務上の便法）',
    weight: 12,
    severity: 'MEDIUM',
    pattern: /(?:少額リース|300万円以下|5,000ドル|契約単位判定|少額免除)/i,
    antiPattern: /(?:300万円超を少額免除|少額300万超|少額基準濫用)/i,
    detail: '少額資産リース免除（新品購入価格300万円以下基準等）の適用にあたり契約総額ではなく個別原資産基準や集約リスクの確認がありません。',
    remediation: 'PC・複合機等の新品価値基準（300万円以下）を固定資産台帳連携で自動スクリーニングする統制を組んでください。',
  },
  {
    id: 'embedded_lease_saas_logistics_screen',
    title: '倉庫保管・運送・専用ITインフラ等の業務委託における組込リース識別',
    criterion: '新リース会計基準（サービス契約に隠れた組込リース抽出）',
    weight: 13,
    severity: 'HIGH',
    pattern: /(?:組込リース|組み込みリース|委託契約識別|倉庫専用|専用サーバー|SLA識別)/i,
    antiPattern: /(?:組込リース調査なし|契約識別せず|非識別放置)/i,
    detail: '賃貸借契約以外の倉庫寄託契約・専用チャーター便・オンプレ占有ラック等に潜在する組込リースの網羅抽出手順が見当たりません。',
    remediation: '支出勘定科目の購買データから専有資産利用を含む業務委託契約を抽出し購買申請時チェックを必須化してください。',
  },
  {
    id: 'lease_nonlease_component_split',
    title: 'リース構成部分と保守料・共益費・保険料（非リース部分）の合理配分',
    criterion: '企業会計基準第34号（契約における構成部分の識別・配分）',
    weight: 11,
    severity: 'MEDIUM',
    pattern: /(?:リース構成部分|非リース構成部分|保守料区分|共益費区分|独立価格配分)/i,
    antiPattern: /(?:保守料混在未配分|非リース分離なし)/i,
    detail: 'オフィス賃料に含まれる共益費・清掃費やメンテナンス付リースの保守費用を独立価格比率で配分するか一体処理する方針が不明確です。',
    remediation: '請求内訳・独立販売価格に基づくリース/非リース構成部分の分離基準と経過措置の採用可否を明確化してください。',
  },
  {
    id: 'asbj34_financial_notes_retention',
    title: 'B/S使用権資産区分・加重平均割引率・満期分析注記 ＆ 根拠保存',
    criterion: '企業会計基準第34号（開示・注記 ＆ 監査証跡保存）',
    weight: 11,
    severity: 'MEDIUM',
    pattern: /(?:企業会計基準第34号|注記開示|満期分析|加重平均割引率|計算根拠保存|減価償却)/i,
    antiPattern: /(?:注記省略|計算根拠破棄)/i,
    detail: '使用権資産の減価償却費・支払利息・加重平均残存リース期間・割引率・未割引キャッシュフロー満期分析の注記準備が不十分です。',
    remediation: '決算期ごとの仕訳・残高推移表・IBR採用根拠を電子保存し有価証券報告書等のリース注記表と整合させてください。',
  },
];

export function evaluateAsbj34LeasePv({
  monthlyLeaseJpy = 0,
  leaseTermMonths = 36,
  annualDiscountRatePct = 1.5,
  underlyingNewValueJpy = 0,
  hasPurchaseOption = false,
  controlsIdentifiedAsset = true,
  alreadyOnBalanceSheet = false,
} = {}) {
  const monthly = Math.max(0, Number(monthlyLeaseJpy) || 0);
  const months = Math.max(0, Math.trunc(Number(leaseTermMonths) || 0));
  const annualPct = Math.max(0, Number(annualDiscountRatePct) || 0);
  const newVal = Math.max(0, Number(underlyingNewValueJpy) || 0);

  const isShortTermExempt = Boolean(months >= 1 && months <= 12 && !hasPurchaseOption);
  const isLowValueExempt = Boolean(newVal > 0 && newVal <= 3_000_000);
  const onBalanceRequired = Boolean(
    controlsIdentifiedAsset && !isShortTermExempt && !isLowValueExempt && monthly > 0 && months > 0
  );

  const i = annualPct / 100 / 12;
  let pvJpy = 0;
  if (monthly > 0 && months > 0) {
    if (i === 0) {
      pvJpy = Math.round(monthly * months);
    } else {
      pvJpy = Math.round((monthly * (1 - Math.pow(1 + i, -months))) / i);
    }
  }

  const totalUndiscountedJpy = Math.round(monthly * months);
  const yrMonths = Math.min(12, months);
  let balance = pvJpy;
  let year1Interest = 0;
  for (let m = 0; m < yrMonths; m += 1) {
    const interest = balance * i;
    const principal = monthly - interest;
    year1Interest += interest;
    balance = Math.max(0, balance - principal);
  }
  const year1InterestExpenseJpy = Math.round(year1Interest);
  const year1DepreciationJpy = months > 0 ? Math.round((pvJpy / months) * yrMonths) : 0;
  const offBalanceOmissionRisk = Boolean(onBalanceRequired && !alreadyOnBalanceSheet);

  return {
    monthlyLeaseJpy: monthly,
    leaseTermMonths: months,
    annualDiscountRatePct: annualPct,
    underlyingNewValueJpy: newVal,
    hasPurchaseOption: Boolean(hasPurchaseOption),
    controlsIdentifiedAsset: Boolean(controlsIdentifiedAsset),
    isShortTermExempt,
    isLowValueExempt,
    onBalanceRequired,
    alreadyOnBalanceSheet: Boolean(alreadyOnBalanceSheet),
    offBalanceOmissionRisk,
    totalUndiscountedJpy,
    leaseLiabilityPvJpy: pvJpy,
    rouAssetInitialJpy: pvJpy,
    year1InterestExpenseJpy,
    year1DepreciationJpy,
  };
}

export function auditAsbj34Lease(contractText = '', options = {}) {
  const normalized = String(contractText || '').replace(/\u3000/g, ' ').trim();
  const metrics = evaluateAsbj34LeasePv(options);

  const findings = [];
  const passedPillars = [];
  let rawScore = 0;

  for (const pillar of PILLARS) {
    const matched = pillar.pattern.test(normalized);
    const negated = pillar.antiPattern.test(normalized);
    if (matched && !negated) {
      rawScore += pillar.weight;
      passedPillars.push({
        id: pillar.id,
        title: pillar.title,
        criterion: pillar.criterion,
        weight: pillar.weight,
      });
    } else {
      findings.push({
        id: pillar.id,
        title: pillar.title,
        criterion: pillar.criterion,
        severity: pillar.severity,
        detail: negated ? `NG経理処理パターン検出（${pillar.detail}）` : pillar.detail,
        remediation: pillar.remediation,
      });
    }
  }

  let penalty = 0;
  if (metrics.offBalanceOmissionRisk) {
    penalty += 30;
    findings.push({
      id: 'off_balance_omission',
      title: 'オンバランス対象リース（短期・少額免除外）の資産・負債計上漏れ',
      criterion: `企業会計基準第34号 リース負債PV ${metrics.leaseLiabilityPvJpy.toLocaleString('en-US')}円`,
      severity: 'HIGH',
      detail: `使用権資産およびリース負債 ${metrics.leaseLiabilityPvJpy.toLocaleString('en-US')}円 をB/Sへオンバランス計上すべき契約がオフバランス扱いになっています。`,
      remediation: '使用権資産とリース負債（現在価値）を認識し、初年度支払利息・減価償却費仕訳へ切り替えてください。',
    });
  }

  const score = Math.min(100, Math.max(0, rawScore - penalty));
  let readinessLabel = 'オンバランス計上漏れ・監査指摘リスクあり';
  let status = 'fail';
  if (score >= 88 && findings.every((f) => f.severity !== 'HIGH')) {
    readinessLabel = '新リース会計基準（企業会計基準第34号）適合';
    status = 'pass';
  } else if (score >= 65) {
    readinessLabel = '一部補完推奨（識別判定・注記条件確認）';
    status = 'warn';
  }

  return {
    score,
    status,
    readinessLabel,
    metrics,
    passedPillars,
    findings,
    passedCount: passedPillars.length,
    totalPillars: PILLARS.length,
  };
}

export function generateLeaseComplianceMarkdown(auditResult, meta = {}) {
  const org = String(meta.organizationName || '貴社（未設定）').trim() || '貴社（未設定）';
  const contractName = String(meta.contractName || '対象リース契約（未設定）').trim() || '対象リース契約（未設定）';
  const today = new Date().toISOString().slice(0, 10);
  const m = auditResult.metrics;

  const lines = [
    '# 新リース会計基準（企業会計基準第34号）オンバランス影響試算・監査書',
    '',
    `- **作成日**: ${today}`,
    `- **事業者名**: ${org}`,
    `- **対象契約**: ${contractName}`,
    `- **会計基準適合スコア**: **${auditResult.readinessLabel}**（\`${auditResult.score}/100\` / 充足 \`${auditResult.passedCount}/${auditResult.totalPillars}\`）`,
    '',
    '## 1. 割引現在価値（PV）・免除判定 ＆ 初年度P/L試算',
    '',
    `- **月額リース料 / リース期間 / 年率割引率(IBR)**: \`${m.monthlyLeaseJpy.toLocaleString('en-US')} JPY\` × \`${m.leaseTermMonths}か月\` @ \`${m.annualDiscountRatePct}%\``,
    `- **免除要件判定**: 短期リース(<=12m・購入Opt無): \`${m.isShortTermExempt ? '該当' : '非該当'}\` / 少額資産(<=300万円): \`${m.isLowValueExempt ? '該当' : '非該当'}\` -> **\`${m.onBalanceRequired ? 'オンバランス必須対象' : 'オフバランス簡便処理可'}\`**`,
    `- **当初認識額（リース負債PV ＆ 使用権資産）**: \`${m.leaseLiabilityPvJpy.toLocaleString('en-US')} JPY\`（名目支払総額 \`${m.totalUndiscountedJpy.toLocaleString('en-US')} JPY\`）`,
    `- **初年度損益影響（1年目）**: 減価償却費 \`${m.year1DepreciationJpy.toLocaleString('en-US')} JPY\` ＋ 支払利息 \`${m.year1InterestExpenseJpy.toLocaleString('en-US')} JPY\``,
    `- **計上状況**: \`${m.alreadyOnBalanceSheet ? 'オンバランス計上済' : m.offBalanceOmissionRisk ? '未計上・計上漏れリスク(NG)' : '簡便処理範囲内'}\``,
    '',
    '## 2. 企業会計基準第34号 8大実務統制チェック',
    '',
    '| 会計・内部統制チェック項目 | 判定 | 根拠 / 是正事項 |',
    '|---|---|---|',
  ];

  for (const p of auditResult.passedPillars) {
    lines.push(`| ${p.title} | 充足 | ${p.criterion} |`);
  }
  for (const f of auditResult.findings) {
    lines.push(`| ${f.title} | 要是正 (${f.severity}) | ${f.detail} ／ 是正案: ${f.remediation} |`);
  }

  lines.push(
    '',
    '---',
    '*本試算書は LEASEGATE（リース門）によりリース契約情報・賃料・割引率を社外サーバーへ一切送信せずブラウザローカルで算定されました（ネットワーク通信: `0`回）。*'
  );

  return lines.join('\n');
}
