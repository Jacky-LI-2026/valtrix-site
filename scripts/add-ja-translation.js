const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'config', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf-8');

// 检查是否已经有某种语言的翻译
function hasLanguage(lang) {
  const pattern = new RegExp(`^\\s+${lang}:\\s*\\{`, 'm');
  return pattern.test(content);
}

// 日文翻译
const jaTranslations = `  ja: {
    home: "ホーム",
    products: "製品",
    industries: "応用分野",
    services: "サービス",
    resources: "リソース",
    news: "ニュース",
    about: "会社概要",
    careers: "採用情報",
    contact: "お問い合わせ",
    search: "検索",
    heroBadge: "国家級ハイテク企業 · 専精特新中小企業",
    heroTitle1: "自主研究開発",
    heroTitle2: "ダイヤモンドで未来を切り開く",
    heroDesc: "左文科技はMPCVDダイヤモンド材料製造のコアプロセスに特化し、2.45GHzおよび915MHzマイクロ波プラズマCVD装置を自主開発し、装置製造からダイヤモンド製品応用までの全チェーンコア技術を実現しています。",
    heroTitle2_2: "全産業チェーン",
    heroSubtitle2_2: "自主制御可能",
    heroDesc2: "CVDダイヤモンド合成プロセス、主要装置、原材料のコア技術と自主知的財産権を掌握。深セン量産拠点で工業用および宝飾級ダイヤモンドの大量生産を実現。",
    heroCta2: "強みを見る",
    heroTitle3_3: "グローバルサービス",
    heroSubtitle3_3: "迅速な対応",
    heroDesc3: "北京本社 + 深セン量産拠点のデュアルドライブ。製品とサービスは中国、東南アジア、ヨーロッパ、北米をカバーし、ローカライズされた技術サポートを提供。",
    heroCta3: "お問い合わせ",
    browseProducts: "製品を見る",
    getSolution: "ソリューションを取得",
    productSeries: "製品シリーズ",
    targetIndustries: "応用分野",
    cleanroomLevel: "特許技術",
    heliumLeakTest: "ヘリウムリークテスト認証",
    productCenter: "製品展示",
    productCenterDesc: "ダイヤモンド材料製造のコアプロセスを中心に、MPCVDシステム、プロセス補助装置、ダイヤモンド材料製品を提供",
    viewAllProducts: "すべての製品を見る",
    viewDetails: "詳細を見る",
    technicalSpecs: "技術仕様",
    productFeatures: "主な特徴",
    productSeriesTitle: "製品シリーズ",
    productSeriesDesc: "多様なシリーズモデルで、異なるアプリケーションニーズに対応",
    applications: "応用分野",
    applicationsDesc: "複数の業界分野で広く使用",
    relatedProducts: "関連製品",
    inquiryNow: "見積もり依頼",
    downloadCatalog: "カタログをダウンロード",
    backToProducts: "製品一覧に戻る",
    productOverview: "製品概要",
    needHelp: "製品選定でお困りですか？",
    needHelpDesc: "当社の技術エンジニアが専門的な選定アドバイスを提供します",
    industryApplications: "応用分野",
    industryApplicationsDesc: "ダイヤモンド材料および製造装置は、複数のハイエンド製造・技術分野で広く応用",
    viewAllIndustries: "すべての分野を見る",
    learnMore: "詳細を見る",
    industryOverview: "分野概要",
    keyChallenges: "業界の課題",
    ourSolutions: "左文科技ソリューション",
    ourSolutionsDesc: "当該分野の特徴に合わせ、専門的なダイヤモンド材料と装置ソリューションを提供",
    recommendedProducts: "おすすめ製品",
    recommendedProductsDesc: "当該分野に適したコア製品",
    viewAllProducts2: "すべての製品を見る",
    cases: "応用事例",
    casesDesc: "当該分野での代表的なプロジェクト",
    relatedIndustries: "関連分野",
    needIndustrySolution: "当該分野のソリューションが必要ですか？",
    needIndustrySolutionDesc: "当社の業界専門家が専門的なコンサルティングと方案設計を提供します",
    odmService: "ODMカスタムサービス",
    mpcvdService: "MPCVDプロセスサービス",
    technicalSupport: "技術サポート",
    afterSales: "アフターサービス",
    newBadge: "NEW",
    aboutUs: "会社概要",
    aboutUsDesc: "ダイヤモンド新材料および製造装置の研究開発、生産、サービスに特化した技術革新型企業",
    companyProfile: "会社概要",
    companyCulture: "企業文化",
    ourHistory: "発展の歩み",
    ourHonors: "栄誉と資格",
    yearsExperience: "年の業界経験",
    globalClients: "取引先",
    productCategories: "製品カテゴリー",
    countries: "サービス提供国",
    joinUs: "採用情報",
    joinUsDesc: "優秀な人材と共に、意義のある仕事を",
    openPositions: "募集職種",
    benefits: "福利厚生",
    applyNow: "今すぐ応募",
    contactUs: "お問い合わせ",
    contactUsDesc: "製品に関するご質問、技術サポート、提携のご相談など、お気軽にお問い合わせください",
    contactInfo: "連絡先",
    onlineForm: "オンラインフォーム",
    name: "お名前",
    company: "会社名",
    phone: "電話番号",
    email: "メールアドレス",
    inquiryType: "お問い合わせ種別",
    message: "メッセージ内容",
    submit: "送信",
    businessHours: "営業時間",
    weekdays: "月曜日〜金曜日 9:00-18:00",
    holidays: "祝日休業",
    mapPlaceholder: "地図位置",
    catalogs: "製品カタログ",
    certificates: "証明書",
    drawings: "図面",
    download: "ダウンロード",
    newsTitle: "ニュース",
    newsDesc: "左文科技の最新情報と業界ニュースをご覧ください",
    featuredNews: "トップニュース",
    moreNews: "その他のニュース",
    readMore: "続きを読む",
    ctaTitle: "ダイヤモンドプロジェクトを始める準備はできていますか？",
    ctaDesc: "MPCVD装置、培育ダイヤモンド、ダイヤモンド新材料ソリューションなど、左文科技の専門チームがいつでもサポートします。今すぐお問い合わせいただき、専用ソリューションを入手してください。",
    ctaButton: "今すぐ相談",
    footerDesc: "ダイヤモンドで未来を切り開く。左文科技はMPCVDダイヤモンド材料製造装置と新材料の研究開発に特化し、ハイエンド製造、エレクトロニクス、光学、新エネルギー、宝飾などの分野に信頼できるソリューションを提供します。",
    productCenterFooter: "製品",
    industryFooter: "応用分野",
    supportFooter: "サポート",
    aboutFooter: "会社概要",
    allRightsReserved: "All rights reserved.",
    notFound: "ページが見つかりません",
    notFoundDesc: "申し訳ありませんが、アクセスしようとしたページは存在しないか、移動されました。URLを確認するか、ホームページに戻ってください。",
    backToHome: "ホームに戻る",
    browseProductsFooter: "製品を見る",
    youMayWant: "こちらもご覧ください：",
    loading: "読み込み中...",
    back: "戻る",
  },`;

// 添加翻译
function addTranslation(lang, translations) {
  if (hasLanguage(lang)) {
    console.log(`${lang} 翻译已存在，跳过`);
    return false;
  }
  content = content.replace('} as const;', translations + '\n} as const;');
  console.log(`${lang} 翻译已添加`);
  return true;
}

// 添加日文翻译
addTranslation('ja', jaTranslations);

fs.writeFileSync(i18nPath, content, 'utf-8');
console.log('文件已更新');
