/**
 * 商城前台文案（购物车 / 结算 / 领券中心 / 查单）—— **六语种并排维护**
 * ==========================================================================
 * owner 2026-10-14「前台显示多语言」：这四页此前基本是**中文硬编码**，
 * 非中文访客在购物车里会看到「优惠券 / 不适用 / 实付」这种中文。
 *
 * 为什么单独一个文件、而不是塞进 `config/i18n.ts`：
 *   `config/i18n.ts` 是"每个语言一个巨型对象"的写法，同一句话要**写六遍**
 *   （且分处文件的 6 个不同位置）。这里改成**一行 = 一条文案 × 六语种**，
 *   新增/校对时六种语言在同一个屏幕上，漏翻一眼就能看出来；
 *   再由 `config/i18n.ts` 在六个语言对象里各 `...shopOf("<locale>")` 展开合并。
 *
 * ⚠️ 文件里**不得出现站点专属品牌名/联系方式**（两站共用同一份，G2/G9）。
 */
/**
 * ⚠️ **只能用 `import type`**（编译后会被完全擦除）。
 *
 * `config/i18n.ts` 会在求值 `translations` 时调用本模块的 `shopOf()`，
 * 若这里再 `import { locales }` 形成**运行期循环依赖**：i18n.ts 尚未执行到
 * `export const locales` 那行时，本模块就要读它 ⇒ `ReferenceError: Cannot access
 * 'locales' before initialization`（TDZ）。而 `i18n.ts` 被 `app/layout.tsx` 引用
 * ⇒ **全站 500**。2026-10-14 本机实测踩到（部署前拦下）。
 */
import type { Locale } from "./i18n";

/**
 * 一行一条：[key]: { zh, en, ja, ko, fr, ar }
 *
 * `as const satisfies`（TS 4.9+）两个作用：
 *   · `satisfies` 保证**每条都齐 6 个语种**（漏一个就编译不过）；
 *   · `as const` 保留**字面量 key**，这样 `t("shopCouponOk")` 仍受类型检查 ——
 *     若只写 `Record<string, string>`，`keyof` 会退化成 `string`，
 *     全站 `t()` 的拼写检查就整体失效了（不是小事）。
 */
export const SHOP_I18N = {
  // ── 购物车 / 结算 公用 ────────────────────────────────────────────────
  shopCouponRemove: { zh: "不使用", en: "Remove", ja: "使用しない", ko: "사용 안 함", fr: "Retirer", ar: "إزالة" },
  shopCouponCodePh: {
    zh: "输入销售提供的优惠券码", en: "Enter the coupon code", ja: "クーポンコードを入力",
    ko: "쿠폰 코드 입력", fr: "Saisir le code du coupon", ar: "أدخل رمز القسيمة",
  },
  shopChecking: { zh: "校验中…", en: "Checking…", ja: "確認中…", ko: "확인 중…", fr: "Vérification…", ar: "جارٍ التحقق…" },
  shopApply: { zh: "应用", en: "Apply", ja: "適用", ko: "적용", fr: "Appliquer", ar: "تطبيق" },
  shopCouponPick: {
    zh: "或选择已领取的优惠券：", en: "Or pick a coupon you claimed:", ja: "または取得済みクーポンを選択：",
    ko: "또는 보유한 쿠폰 선택:", fr: "Ou choisissez un coupon déjà réclamé :", ar: "أو اختر قسيمة حصلت عليها:",
  },
  shopCouponRemoved: { zh: "已不使用优惠券", en: "Coupon removed", ja: "クーポンを外しました", ko: "쿠폰을 사용하지 않음", fr: "Coupon retiré", ar: "تم إلغاء القسيمة" },
  shopCouponOk: { zh: "券码已生效", en: "Coupon applied", ja: "クーポンを適用しました", ko: "쿠폰이 적용되었습니다", fr: "Coupon appliqué", ar: "تم تطبيق القسيمة" },
  shopCouponInvalid: { zh: "券码无效", en: "Invalid coupon code", ja: "無効なクーポンコード", ko: "유효하지 않은 쿠폰 코드", fr: "Code de coupon invalide", ar: "رمز قسيمة غير صالح" },
  shopNetError: { zh: "网络错误，请重试", en: "Network error, please retry", ja: "通信エラー。再試行してください", ko: "네트워크 오류, 다시 시도하세요", fr: "Erreur réseau, veuillez réessayer", ar: "خطأ في الشبكة، يرجى المحاولة مرة أخرى" },
  shopDiscount: { zh: "优惠", en: "Discount", ja: "割引", ko: "할인", fr: "Remise", ar: "الخصم" },
  shopSubmitFailed: { zh: "提交失败", en: "Submission failed", ja: "送信に失敗しました", ko: "제출 실패", fr: "Échec de l'envoi", ar: "فشل الإرسال" },
  shopLoadingCheckout: { zh: "正在加载结算信息…", en: "Loading checkout…", ja: "決済情報を読み込み中…", ko: "결제 정보를 불러오는 중…", fr: "Chargement du paiement…", ar: "جارٍ تحميل الدفع…" },
  shopGuestTip: {
    zh: "未登录也可以直接下单：本流程只做需求留资，销售会在 1–2 个工作日内联系你。",
    en: "You can order without signing in — we only collect your request here, and our sales team will contact you within 1–2 business days.",
    ja: "ログインなしでも注文できます。ここではご要望を承るのみで、1〜2営業日以内に営業担当者がご連絡します。",
    ko: "로그인 없이도 주문할 수 있습니다. 여기서는 요청만 접수하며, 영업 담당자가 1~2 영업일 내에 연락드립니다.",
    fr: "Vous pouvez commander sans vous connecter : nous recueillons votre demande et notre équipe commerciale vous contactera sous 1 à 2 jours ouvrés.",
    ar: "يمكنك الطلب دون تسجيل الدخول؛ نجمع طلبك هنا فقط وسيتواصل معك فريق المبيعات خلال ١-٢ يوم عمل.",
  },
  shopLogin: { zh: "登录", en: "Sign in", ja: "ログイン", ko: "로그인", fr: "Se connecter", ar: "تسجيل الدخول" },
  shopGuestTip2: {
    zh: "后可自动带出资料、查看历史订单与会员价。",
    en: " to auto-fill your details and view past orders and member pricing.",
    ja: "すると情報が自動入力され、過去の注文と会員価格を確認できます。",
    ko: "하면 정보가 자동 입력되고 이전 주문과 회원 가격을 확인할 수 있습니다.",
    fr: " pour préremplir vos informations et voir vos commandes et tarifs membres.",
    ar: " لملء بياناتك تلقائيًا وعرض طلباتك وأسعار الأعضاء.",
  },
  shopInvoiceTitle: { zh: "发票抬头", en: "Invoice title", ja: "請求書宛名", ko: "세금계산서 명의", fr: "Intitulé de facture", ar: "اسم الفاتورة" },
  shopInvoiceTitlePh: {
    zh: "公司全称，会员中心可预设", en: "Full company name (can be preset in your account)",
    ja: "会社の正式名称（会員センターで事前設定可）", ko: "회사 전체 이름(회원 센터에서 미리 설정 가능)",
    fr: "Raison sociale complète (préconfigurable dans votre compte)", ar: "الاسم الكامل للشركة (يمكن ضبطه مسبقًا)",
  },
  shopTaxNo: { zh: "税号", en: "Tax ID", ja: "納税者番号", ko: "사업자등록번호", fr: "N° de TVA", ar: "الرقم الضريبي" },
  shopTaxNoPh: {
    zh: "纳税人识别号（选填）", en: "Tax identification number (optional)", ja: "納税者番号（任意）",
    ko: "사업자등록번호(선택)", fr: "Numéro d'identification fiscale (facultatif)", ar: "الرقم الضريبي (اختياري)",
  },

  // ── 领券中心 ────────────────────────────────────────────────────────
  shopCouponSub: {
    zh: "领取专属优惠，下单更划算", en: "Claim coupons and save on your order", ja: "クーポンを取得して、お得に注文",
    ko: "쿠폰을 받아 더 저렴하게 주문하세요", fr: "Réclamez des coupons et économisez", ar: "احصل على القسائم ووفّر في طلبك",
  },
  shopCouponLogin: {
    zh: "登录会员后可领取优惠券，", en: "Sign in to claim coupons,", ja: "ログインするとクーポンを取得できます。",
    ko: "로그인 후 쿠폰을 받을 수 있습니다,", fr: "Connectez-vous pour réclamer des coupons,", ar: "سجّل الدخول للحصول على القسائم،",
  },
  shopGoLogin: { zh: "去登录", en: "Sign in", ja: "ログインする", ko: "로그인하기", fr: "Se connecter", ar: "تسجيل الدخول" },
  shopClaimOk: {
    zh: "领取成功！可在购物车选择使用", en: "Claimed! Use it in your cart", ja: "取得しました！カートで使用できます",
    ko: "받았습니다! 장바구니에서 사용하세요", fr: "Réclamé ! Utilisez-le dans votre panier", ar: "تم الحصول عليها! استخدمها في السلة",
  },
  shopClaimFail: { zh: "领取失败", en: "Claim failed", ja: "取得に失敗しました", ko: "받기 실패", fr: "Échec de la réclamation", ar: "فشل الحصول على القسيمة" },
  shopNetErrorShort: { zh: "网络错误", en: "Network error", ja: "通信エラー", ko: "네트워크 오류", fr: "Erreur réseau", ar: "خطأ في الشبكة" },
  shopCouponEnded: { zh: "已结束", en: "Ended", ja: "終了", ko: "종료", fr: "Terminé", ar: "منتهية" },
  shopNoExpiry: { zh: "长期有效", en: "No expiry", ja: "無期限", ko: "기간 제한 없음", fr: "Sans expiration", ar: "بدون تاريخ انتهاء" },
  shopValidUntil: { zh: "有效期至", en: "Valid until", ja: "有効期限", ko: "유효 기간", fr: "Valable jusqu'au", ar: "صالح حتى" },
  shopClaiming: { zh: "领取中…", en: "Claiming…", ja: "取得中…", ko: "받는 중…", fr: "Réclamation…", ar: "جارٍ الحصول…" },
  shopClaimed: { zh: "已领取", en: "Claimed", ja: "取得済み", ko: "받음", fr: "Réclamé", ar: "تم الحصول" },
  shopClaimAfterLogin: { zh: "登录后领取", en: "Sign in to claim", ja: "ログインして取得", ko: "로그인 후 받기", fr: "Se connecter pour réclamer", ar: "سجّل الدخول للحصول" },
  shopClaim: { zh: "领取", en: "Claim", ja: "取得する", ko: "받기", fr: "Réclamer", ar: "احصل عليها" },
  shopNoCoupons: { zh: "暂无可领取的优惠券", en: "No coupons available", ja: "取得できるクーポンはありません", ko: "받을 수 있는 쿠폰이 없습니다", fr: "Aucun coupon disponible", ar: "لا توجد قسائم متاحة" },
  shopCouponCodeTip: {
    zh: "已有优惠券码？直接在购物车结算时输入即可使用，无需领取。",
    en: "Already have a code? Just enter it at checkout — no need to claim it first.",
    ja: "すでにコードをお持ちですか？カートの決済時に直接入力して使用できます。",
    ko: "이미 코드가 있으신가요? 장바구니 결제 시 바로 입력하면 됩니다.",
    fr: "Vous avez déjà un code ? Saisissez-le au paiement, aucune réclamation nécessaire.",
    ar: "لديك رمز بالفعل؟ أدخله عند الدفع، دون الحاجة إلى الحصول عليه أولاً.",
  },
  shopCouponMaxOff: { zh: "最高减", en: "up to", ja: "最大", ko: "최대", fr: "jusqu'à", ar: "حتى" },
  shopCouponNoMin: { zh: "无门槛", en: "No minimum", ja: "最低利用額なし", ko: "최소 금액 없음", fr: "Sans minimum", ar: "بدون حد أدنى" },
  shopCouponNoThreshold: { zh: "不限门槛", en: "No threshold", ja: "最低利用額なし", ko: "금액 제한 없음", fr: "Sans seuil", ar: "بدون شرط" },
  shopCouponMinPre: { zh: "满", en: "Min.", ja: "", ko: "", fr: "Dès", ar: "من" },
  shopCouponMinSuf: { zh: "可用", en: "to use", ja: "以上で利用可", ko: "이상 사용 가능", fr: "pour l'utiliser", ar: "للاستخدام" },

  // ── 查单页（屏幕上的界面文案；文末那张"采购订单"打印单是刻意的中英双语，不动）────
  orderStPending: { zh: "待确认", en: "Pending", ja: "確認待ち", ko: "확인 대기", fr: "En attente", ar: "قيد الانتظار" },
  orderStConfirmed: { zh: "已确认", en: "Confirmed", ja: "確認済み", ko: "확인됨", fr: "Confirmée", ar: "مؤكد" },
  orderStCompleted: { zh: "已完成", en: "Completed", ja: "完了", ko: "완료", fr: "Terminée", ar: "مكتمل" },
  orderStCancelled: { zh: "已取消", en: "Cancelled", ja: "キャンセル", ko: "취소됨", fr: "Annulée", ar: "ملغى" },
  orderPayUnpaid: { zh: "未支付", en: "Unpaid", ja: "未払い", ko: "미결제", fr: "Non payée", ar: "غير مدفوع" },
  orderPayPaid: {
    zh: "已上传凭证（待财务确认）", en: "Receipt uploaded (awaiting finance)", ja: "証憑アップロード済み（経理確認待ち）",
    ko: "증빙 업로드됨(재무 확인 대기)", fr: "Justificatif envoyé (en attente)", ar: "تم رفع الإيصال (بانتظار المحاسبة)",
  },
  orderPayConfirmed: { zh: "已确认到账", en: "Payment confirmed", ja: "入金確認済み", ko: "입금 확인됨", fr: "Paiement confirmé", ar: "تم تأكيد الدفع" },
  orderShipNotShipped: { zh: "待发货", en: "Not shipped", ja: "未発送", ko: "배송 전", fr: "Non expédiée", ar: "لم تُشحن" },
  orderShipShipped: { zh: "已发货", en: "Shipped", ja: "発送済み", ko: "배송 중", fr: "Expédiée", ar: "تم الشحن" },
  orderShipDelivered: { zh: "已送达", en: "Delivered", ja: "配達済み", ko: "배송 완료", fr: "Livrée", ar: "تم التسليم" },
  orderPrintBtn: { zh: "打印订单", en: "Print order", ja: "注文を印刷", ko: "주문 인쇄", fr: "Imprimer la commande", ar: "طباعة الطلب" },
  orderReorder: { zh: "再次订购", en: "Order again", ja: "再注文", ko: "다시 주문", fr: "Commander à nouveau", ar: "اطلب مرة أخرى" },
  orderOnlinePayPending: {
    zh: "在线支付通道待开通，可联系销售或选择对公转账完成付款",
    en: "Online payment is not enabled yet — contact sales or pay by bank transfer",
    ja: "オンライン決済は未対応です。営業へご連絡いただくか、銀行振込をご利用ください",
    ko: "온라인 결제는 아직 지원되지 않습니다. 영업 담당자에게 문의하거나 계좌 이체를 이용하세요",
    fr: "Le paiement en ligne n'est pas encore disponible — contactez le service commercial ou payez par virement",
    ar: "الدفع الإلكتروني غير متاح بعد — تواصل مع المبيعات أو ادفع بالتحويل البنكي",
  },
  orderCreatedAt: { zh: "下单时间", en: "Order date", ja: "注文日時", ko: "주문 일시", fr: "Date de commande", ar: "تاريخ الطلب" },
  orderCustomerPoNo: { zh: "客户采购单号", en: "Customer PO no.", ja: "客先発注番号", ko: "고객 발주 번호", fr: "N° de bon de commande", ar: "رقم أمر الشراء" },
  orderInvoiceLabel: { zh: "发票抬头", en: "Invoice title", ja: "請求書宛名", ko: "세금계산서 명의", fr: "Intitulé de facture", ar: "اسم الفاتورة" },
  orderTaxNoLabel: { zh: "税号", en: "Tax ID", ja: "納税者番号", ko: "사업자등록번호", fr: "N° de TVA", ar: "الرقم الضريبي" },
  orderCustomerLabel: { zh: "客户", en: "Customer", ja: "顧客", ko: "고객", fr: "Client", ar: "العميل" },
  orderCompanyLabel: { zh: "公司", en: "Company", ja: "会社", ko: "회사", fr: "Société", ar: "الشركة" },
  orderShipToLabel: { zh: "收货地址", en: "Shipping address", ja: "配送先", ko: "배송 주소", fr: "Adresse de livraison", ar: "عنوان الشحن" },
  orderRemarkLabel: { zh: "备注", en: "Remarks", ja: "備考", ko: "비고", fr: "Remarques", ar: "ملاحظات" },
  orderColProduct: { zh: "商品", en: "Item", ja: "商品", ko: "상품", fr: "Article", ar: "المنتج" },
  orderColSpec: { zh: "型号/规格", en: "Model / Spec", ja: "型番・仕様", ko: "모델/사양", fr: "Modèle / Spec.", ar: "الطراز / المواصفات" },
  orderColPrice: { zh: "单价", en: "Unit price", ja: "単価", ko: "단가", fr: "Prix unitaire", ar: "سعر الوحدة" },
  orderColQty: { zh: "数量", en: "Qty", ja: "数量", ko: "수량", fr: "Qté", ar: "الكمية" },
  orderColAmount: { zh: "金额", en: "Amount", ja: "金額", ko: "금액", fr: "Montant", ar: "المبلغ" },
  orderPayableTax: { zh: "实付（含税）", en: "Amount due (incl. tax)", ja: "お支払額（税込）", ko: "결제 금액(세금 포함)", fr: "Montant dû (TTC)", ar: "المبلغ المستحق (شامل الضريبة)" },
  orderBankInfoTitle: {
    zh: "对公转账信息（请按以下账户汇款并在下方上传凭证）",
    en: "Bank transfer details (please transfer to the account below and upload the receipt)",
    ja: "銀行振込情報（下記口座へお振込みのうえ、証憑をアップロードしてください）",
    ko: "계좌 이체 정보(아래 계좌로 송금하고 증빙을 업로드하세요)",
    fr: "Coordonnées bancaires (virez sur le compte ci-dessous puis téléversez le justificatif)",
    ar: "بيانات التحويل البنكي (حوّل إلى الحساب أدناه ثم ارفع الإيصال)",
  },
  orderBankAccountName: { zh: "收款单位", en: "Beneficiary", ja: "受取人名義", ko: "예금주", fr: "Bénéficiaire", ar: "المستفيد" },
  orderBankName: { zh: "开户银行", en: "Bank", ja: "銀行名", ko: "은행", fr: "Banque", ar: "البنك" },
  orderBankAccountNo: { zh: "银行账号", en: "Account no.", ja: "口座番号", ko: "계좌 번호", fr: "N° de compte", ar: "رقم الحساب" },
  orderBankBranch: { zh: "开户支行", en: "Branch", ja: "支店名", ko: "지점", fr: "Agence", ar: "الفرع" },
  orderBankNotConfigured: {
    zh: "对公账户信息尚未配置，请联系销售获取账户信息。", en: "Bank account details are not configured yet — please contact sales.",
    ja: "銀行口座情報が未設定です。営業担当者へお問い合わせください。", ko: "계좌 정보가 아직 설정되지 않았습니다. 영업 담당자에게 문의하세요.",
    fr: "Les coordonnées bancaires ne sont pas configurées — contactez le service commercial.",
    ar: "لم يتم إعداد بيانات الحساب البنكي بعد — يرجى التواصل مع المبيعات.",
  },
  orderWechatQr: { zh: "微信收款码", en: "WeChat Pay QR", ja: "WeChat Pay QR", ko: "위챗페이 QR", fr: "QR WeChat Pay", ar: "رمز WeChat Pay" },
  orderAlipayQr: { zh: "支付宝收款码", en: "Alipay QR", ja: "Alipay QR", ko: "알리페이 QR", fr: "QR Alipay", ar: "رمز Alipay" },
  orderQrPayTitle: { zh: "收款码（请扫码付款）", en: "payment QR — scan to pay", ja: "決済QR（読み取ってお支払いください）", ko: "결제 QR(스캔하여 결제)", fr: "QR de paiement — scannez pour payer", ar: "رمز الدفع — امسح للدفع" },
  orderVoucherUploaded: { zh: "凭证已上传", en: "Receipt uploaded", ja: "証憑アップロード済み", ko: "증빙 업로드됨", fr: "Justificatif envoyé", ar: "تم رفع الإيصال" },
  orderView: { zh: "查看", en: "View", ja: "表示", ko: "보기", fr: "Voir", ar: "عرض" },
  orderUploading: { zh: "上传中…", en: "Uploading…", ja: "アップロード中…", ko: "업로드 중…", fr: "Téléversement…", ar: "جارٍ الرفع…" },
  orderUploadVoucher: { zh: "上传转账凭证", en: "Upload transfer receipt", ja: "振込証憑をアップロード", ko: "이체 증빙 업로드", fr: "Téléverser le justificatif", ar: "ارفع إيصال التحويل" },
  orderVoucherHint: {
    zh: "支持 JPG/PNG/WebP/PDF，10MB 以内", en: "JPG/PNG/WebP/PDF, up to 10 MB", ja: "JPG/PNG/WebP/PDF、10MB以内",
    ko: "JPG/PNG/WebP/PDF, 10MB 이하", fr: "JPG/PNG/WebP/PDF, jusqu'à 10 Mo", ar: "JPG/PNG/WebP/PDF حتى 10 ميجابايت",
  },
  orderPayAmount: { zh: "应付金额", en: "Amount due", ja: "お支払金額", ko: "결제 금액", fr: "Montant dû", ar: "المبلغ المستحق" },
  orderPayStatusLabel: { zh: "支付状态", en: "Payment status", ja: "支払状況", ko: "결제 상태", fr: "Statut du paiement", ar: "حالة الدفع" },
  orderShippingInfo: { zh: "物流信息", en: "Shipping information", ja: "配送情報", ko: "배송 정보", fr: "Informations d'expédition", ar: "معلومات الشحن" },
  orderShipper: { zh: "承运", en: "Carrier", ja: "運送会社", ko: "운송사", fr: "Transporteur", ar: "الناقل" },
  orderTrackingNo: { zh: "物流单号", en: "Tracking no.", ja: "追跡番号", ko: "운송장 번호", fr: "N° de suivi", ar: "رقم التتبع" },
  orderQueryLogistics: { zh: "查询物流", en: "Track shipment", ja: "配送状況を確認", ko: "배송 조회", fr: "Suivre l'envoi", ar: "تتبع الشحنة" },
  orderShippedAt: { zh: "发货时间", en: "Shipped at", ja: "発送日時", ko: "발송 일시", fr: "Expédiée le", ar: "تاريخ الشحن" },
  orderDeliveredAt: { zh: "送达时间", en: "Delivered at", ja: "配達日時", ko: "배송 완료 일시", fr: "Livrée le", ar: "تاريخ التسليم" },
  orderQueryFailed: { zh: "查询失败", en: "Lookup failed", ja: "照会に失敗しました", ko: "조회 실패", fr: "Échec de la recherche", ar: "فشل البحث" },
  orderUploadMsgOk: {
    zh: "凭证已上传，财务确认到账后订单将进入已确认状态",
    en: "Receipt uploaded — the order will be confirmed once finance verifies the payment",
    ja: "証憑をアップロードしました。経理の入金確認後、注文は確認済みになります",
    ko: "증빙이 업로드되었습니다. 재무 확인 후 주문이 확정됩니다",
    fr: "Justificatif envoyé — la commande sera confirmée après vérification comptable",
    ar: "تم رفع الإيصال — سيتم تأكيد الطلب بعد تحقق الإدارة المالية",
  },
  orderUploadFailed: { zh: "上传失败", en: "Upload failed", ja: "アップロードに失敗しました", ko: "업로드 실패", fr: "Échec du téléversement", ar: "فشل الرفع" },
  orderUploadNetError: {
    zh: "网络错误，上传失败", en: "Network error, upload failed", ja: "通信エラー、アップロードに失敗しました",
    ko: "네트워크 오류, 업로드 실패", fr: "Erreur réseau, échec du téléversement", ar: "خطأ في الشبكة، فشل الرفع",
  },
} as const satisfies Record<string, Record<Locale, string>>;

/** 商城文案的 key 联合（`t()` 的合法入参之一） */
export type ShopI18nKey = keyof typeof SHOP_I18N;

/**
 * 取某语言的一整套商城文案：在 `config/i18n.ts` 的六个语言对象里各写一行
 * `...shopOf("en")` 展开即可（**类型仍是字面量 key**，见上面的说明）。
 * 某个语种**留空**时回退中文（与全站"缺失回退中文"的口径一致）。
 */
export function shopOf(locale: string): { -readonly [K in keyof typeof SHOP_I18N]: string } {
  // ⚠️ `SHOP_I18N` 是 `as const`（只读），所以这里用 fromEntries 一次性构造，
  //    而不是先建空对象再逐键赋值（后者会报 TS2540 "read-only property"）。
  const entries = (Object.keys(SHOP_I18N) as ShopI18nKey[]).map((key) => {
    const langs = SHOP_I18N[key] as Record<string, string>;
    const v = langs[locale];
    return [key, v !== undefined && v !== "" ? v : langs.zh] as const;
  });
  return Object.fromEntries(entries) as { -readonly [K in keyof typeof SHOP_I18N]: string };
}

