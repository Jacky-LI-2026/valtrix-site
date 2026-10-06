/**
 * 手册**数值规格表**（自动生成，勿手改）
 * ==========================================================================
 * 由 `scripts/_extract_manual_specs.js` 从 `产品手册/html版/<品类>目录页/*.html` 抽出：
 *   · 每系列：名称 / 说明 / 型号示例 / 维度取值 / **rows（数值规格表）**
 *   · 每品类：规格表列头（columns）+ 筛选维度（facets）
 * owner 口径（2026-10-06）：**规格与细分严格从 PDF 手册取**；本文件即"手册数值"的唯一来源，
 * 不用图片加工，只搬运数值。重新抽取：`node scripts/_extract_manual_specs.js`
 */

export interface ManualSeriesSpec {
  id: string;
  nameZh: string;
  nameEn: string;
  formsZh: string;
  formsEn: string;
  models: string[];
  /** 数值规格表的行：值与 `ManualCategorySpec.columns` 一一对应 */
  rows: string[][];
  dims: Record<string, string[]>;
}

export interface ManualCategorySpec {
  /** 与 lib/manual-catalog.ts 的品类 key 对应 */
  category: string;
  /** 来源文件（便于回溯手册页） */
  source: string;
  /** 规格表列头（手册原文） */
  columns: string[];
  /** 该品类的筛选维度与可选值（手册原文代号） */
  facets: { key: string; items: string[] }[];
  series: ManualSeriesSpec[];
}

export const MANUAL_SPECS: ManualCategorySpec[] = [
  {
    "category": "regulator",
    "source": "减压阀目录页/减压阀目录页.html",
    "columns": [
      "型号",
      "端口 · 端接",
      "入口压力 · 出口压力",
      "Cv",
      "温度 · 阀座材料"
    ],
    "facets": [
      {
        "key": "struct",
        "items": [
          "free",
          "coupled"
        ]
      },
      {
        "key": "inlet",
        "items": [
          "h310",
          "h241",
          "h117",
          "h41"
        ]
      },
      {
        "key": "cv",
        "items": [
          "cv009",
          "cv013",
          "cv015",
          "cv016",
          "cv09",
          "cv11"
        ]
      },
      {
        "key": "port",
        "items": [
          "q4",
          "q8",
          "q12"
        ]
      },
      {
        "key": "mat",
        "items": [
          "316L",
          "6V"
        ]
      }
    ],
    "series": [
      {
        "id": "PRE1",
        "nameZh": "PRE1 系列 小流量减压阀",
        "nameEn": "Series PRE1 Low-Flow Regulator",
        "formsZh": "自由膜片 · 小流量 · 1/4\"–1/2\" MR 金属面密封",
        "formsEn": "Free diaphragm · low flow · 1/4\"–1/2\" MR metal face seal",
        "models": [
          "316L-PRE1C-SMR4-BC-OG-PI1-P",
          "PRE1C-FMR4",
          "PRE1C-FMR8",
          "PRE1C-SMR4"
        ],
        "rows": [
          [
            "PRE1C-FMR4",
            "1/4\" FMR 内螺纹面密封",
            "入口 20.7–241 bar · 出口 0.7–21 bar",
            "0.09 / 0.15",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRE1C-FMR8",
            "1/2\" FMR 内螺纹面密封",
            "入口 20.7–241 bar · 出口 0.7–21 bar",
            "0.09 / 0.15",
            "-40–71 °C · PCTFE / Vespel"
          ]
        ],
        "dims": {
          "struct": [
            "free"
          ],
          "inlet": [
            "h241"
          ],
          "cv": [
            "cv009",
            "cv015"
          ],
          "port": [
            "q4",
            "q8"
          ],
          "mat": [
            "316L",
            "6V"
          ]
        }
      },
      {
        "id": "PRE2",
        "nameZh": "PRE2 系列 小流量灵敏减压阀",
        "nameEn": "Series PRE2 Sensitive Low-Flow",
        "formsZh": "自由膜片 · 灵敏调节 · 1/4\"–1/2\" MR",
        "formsEn": "Free diaphragm · sensitive · 1/4\"–1/2\" MR",
        "models": [
          "316L-PRE2C-SMR4-BC-OG-PI-P",
          "PRE2C-FMR4",
          "PRE2C-FMR8"
        ],
        "rows": [
          [
            "PRE2C-FMR4",
            "1/4\" FMR 内螺纹面密封",
            "入口 7–241 bar · 出口 0.7–10 bar",
            "0.13",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRE2C-FMR8",
            "1/2\" FMR 内螺纹面密封",
            "入口 7–241 bar · 出口 0.7–10 bar",
            "0.13",
            "-40–71 °C · PCTFE / Vespel"
          ]
        ],
        "dims": {
          "struct": [
            "free"
          ],
          "inlet": [
            "h241"
          ],
          "cv": [
            "cv013"
          ],
          "port": [
            "q4",
            "q8"
          ],
          "mat": [
            "316L",
            "6V"
          ]
        }
      },
      {
        "id": "PRE3",
        "nameZh": "PRE3 系列 大流量灵敏减压阀",
        "nameEn": "Series PRE3 Sensitive High-Flow",
        "formsZh": "自由膜片 · 大流量 · 1/4\"–3/4\" MR",
        "formsEn": "Free diaphragm · high flow · 1/4\"–3/4\" MR",
        "models": [
          "316L-PRE3C-SMR4-AC-OG-PI-P",
          "PRE3C-FMR8",
          "PRE3C-FMR12"
        ],
        "rows": [
          [
            "PRE3C-FMR4",
            "1/4\" FMR 内螺纹面密封",
            "入口 ≤41.4 bar · 出口 2–10 bar",
            "1.1",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRE3C-FMR8",
            "1/2\" FMR 内螺纹面密封",
            "入口 ≤41.4 bar · 出口 2–10 bar",
            "1.1",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRE3C-FMR12",
            "3/4\" FMR 内螺纹面密封",
            "入口 ≤41.4 bar · 出口 2–10 bar",
            "1.1",
            "-40–71 °C · PCTFE / Vespel"
          ]
        ],
        "dims": {
          "struct": [
            "free"
          ],
          "inlet": [
            "h41"
          ],
          "cv": [
            "cv11"
          ],
          "port": [
            "q4",
            "q8",
            "q12"
          ],
          "mat": [
            "316L",
            "6V"
          ]
        }
      },
      {
        "id": "PRT1",
        "nameZh": "PRT1 系列 小流量减压阀（联结膜片）",
        "nameEn": "Series PRT1 Low-Flow (Coupled)",
        "formsZh": "联结式膜片阀芯 · 高压 310 bar · 1/4\"–1/2\" MR",
        "formsEn": "Coupled diaphragm-poppet · 310 bar high pressure · 1/4\"–1/2\" MR",
        "models": [
          "316L-PRT1C-SMR4-BC-OG-PI1-P",
          "PRT1C-FMR4",
          "PRT1C-FMR8"
        ],
        "rows": [
          [
            "PRT1C-FMR4",
            "1/4\" FMR 内螺纹面密封",
            "入口 ≤310 bar · 出口 2–6.9 bar",
            "0.09 / 0.15",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRT1C-FMR8",
            "1/2\" FMR 内螺纹面密封",
            "入口 ≤310 bar · 出口 2–6.9 bar",
            "0.09 / 0.15",
            "-40–71 °C · PCTFE / Vespel"
          ]
        ],
        "dims": {
          "struct": [
            "coupled"
          ],
          "inlet": [
            "h310"
          ],
          "cv": [
            "cv009",
            "cv015"
          ],
          "port": [
            "q4",
            "q8"
          ],
          "mat": [
            "316L",
            "6V"
          ]
        }
      },
      {
        "id": "PRT2",
        "nameZh": "PRT2 系列 小流量灵敏减压阀（联结膜片）",
        "nameEn": "Series PRT2 Sensitive Low-Flow (Coupled)",
        "formsZh": "联结式膜片阀芯 · 灵敏 · 1/4\"–1/2\" MR",
        "formsEn": "Coupled diaphragm-poppet · sensitive · 1/4\"–1/2\" MR",
        "models": [
          "316L-PRT2C-SMR4-AC-OG-PI-P",
          "PRT2C-FMR4",
          "PRT2C-FMR8"
        ],
        "rows": [
          [
            "PRT2C-FMR4",
            "1/4\" FMR 内螺纹面密封",
            "入口 ≤241 bar · 出口 0.7–10 bar",
            "0.13 / 0.16",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRT2C-FMR8",
            "1/2\" FMR 内螺纹面密封",
            "入口 ≤241 bar · 出口 0.7–10 bar",
            "0.13 / 0.16",
            "-40–71 °C · PCTFE / Vespel"
          ]
        ],
        "dims": {
          "struct": [
            "coupled"
          ],
          "inlet": [
            "h241"
          ],
          "cv": [
            "cv013",
            "cv016"
          ],
          "port": [
            "q4",
            "q8"
          ],
          "mat": [
            "316L",
            "6V"
          ]
        }
      },
      {
        "id": "PRT3",
        "nameZh": "PRT3 系列 大流量灵敏减压阀（联结膜片）",
        "nameEn": "Series PRT3 Sensitive High-Flow (Coupled)",
        "formsZh": "联结式膜片阀芯 · 大流量 · 1/4\"–3/4\" MR",
        "formsEn": "Coupled diaphragm-poppet · high flow · 1/4\"–3/4\" MR",
        "models": [
          "316L-PRT3C-SMR4-BC-OG-PI-P",
          "PRT3C-FMR8",
          "PRT3C-FMR12"
        ],
        "rows": [
          [
            "PRT3C-FMR4",
            "1/4\" FMR 内螺纹面密封",
            "入口 ≤117 bar · 出口 2–10 bar",
            "0.9 / 1.1",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRT3C-FMR8",
            "1/2\" FMR 内螺纹面密封",
            "入口 ≤117 bar · 出口 2–10 bar",
            "0.9 / 1.1",
            "-40–71 °C · PCTFE / Vespel"
          ],
          [
            "PRT3C-FMR12",
            "3/4\" FMR 内螺纹面密封",
            "入口 ≤117 bar · 出口 2–10 bar",
            "0.9 / 1.1",
            "-40–71 °C · PCTFE / Vespel"
          ]
        ],
        "dims": {
          "struct": [
            "coupled"
          ],
          "inlet": [
            "h117"
          ],
          "cv": [
            "cv09",
            "cv11"
          ],
          "port": [
            "q4",
            "q8",
            "q12"
          ],
          "mat": [
            "316L",
            "6V"
          ]
        }
      }
    ]
  },
  {
    "category": "check",
    "source": "单向阀目录页/单向阀目录页.html",
    "columns": [
      "型号",
      "端口 · 端接",
      "开启压力",
      "最大工作压力",
      "工作温度"
    ],
    "facets": [
      {
        "key": "mat",
        "items": [
          "316L",
          "6V",
          "6VV"
        ]
      },
      {
        "key": "size",
        "items": [
          "14",
          "12"
        ]
      },
      {
        "key": "crack",
        "items": [
          "P014"
        ]
      },
      {
        "key": "end",
        "items": [
          "FMR",
          "MR",
          "SMR",
          "TB"
        ]
      }
    ],
    "series": [
      {
        "id": "CV3",
        "nameZh": "CV3 系列 全焊接单向阀",
        "nameEn": "Series CV3 Fully-Welded Check Valve",
        "formsZh": "全焊接 · 专利阀头弹片 · FKM 缺省密封",
        "formsEn": "Fully welded · patented head flap · FKM seal default",
        "models": [
          "316L-CV3-FMR4-N-HP",
          "CV3-FMR4",
          "CV3-MR4",
          "CV3-SMR4",
          "CV3-TB4",
          "CV3-FMR8",
          "CV3-MR8",
          "CV3-SMR8",
          "CV3-TB8"
        ],
        "rows": [
          [
            "CV3-FMR4",
            "1/4\" 内螺纹 FMR 面密封",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ],
          [
            "CV3-MR4",
            "1/4\" 整体外螺纹 MR 面密封",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ],
          [
            "CV3-SMR4",
            "1/4\" 可旋转外螺纹 SMR 面密封",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ],
          [
            "CV3-TB4",
            "1/4\" Tube 管对焊 (0.035\")",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ],
          [
            "CV3-FMR8",
            "1/2\" 内螺纹 FMR 面密封",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ],
          [
            "CV3-MR8",
            "1/2\" 整体外螺纹 MR 面密封",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ],
          [
            "CV3-SMR8",
            "1/2\" 可旋转外螺纹 SMR 面密封",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ],
          [
            "CV3-TB8",
            "1/2\" Tube 管对焊 (0.049\")",
            "< 0.14 bar (2 psig)",
            "207 bar (3000 psig)",
            "-23 ~ 204 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "ends": [
            "FMR",
            "MR",
            "SMR",
            "TB"
          ],
          "sizes": [
            "14",
            "12"
          ],
          "crack": [
            "P014"
          ]
        }
      }
    ]
  },
  {
    "category": "fittings",
    "source": "接头目录页/接头目录页.html",
    "columns": [
      "型号",
      "材料",
      "端接 / 密封",
      "表面粗糙度",
      "工作温度"
    ],
    "facets": [
      {
        "key": "cat",
        "items": [
          "I",
          "B",
          "G",
          "O"
        ]
      },
      {
        "key": "mat",
        "items": [
          "316L",
          "6V",
          "6VV"
        ]
      },
      {
        "key": "proc",
        "items": [
          "GP",
          "HP",
          "UHP"
        ]
      },
      {
        "key": "surf",
        "items": [
          "Ra5",
          "Ra10"
        ]
      },
      {
        "key": "oring",
        "items": [
          "FKM",
          "PTFE",
          "NBR",
          "FFKM",
          "EPDM"
        ]
      }
    ],
    "series": [
      {
        "id": "I",
        "nameZh": "I 系列 微焊接接头",
        "nameEn": "Series I Micro-Weld",
        "formsZh": "变径直通 / 弯头 / 三通 / 四通 / 焊接环",
        "formsEn": "Reducer union / Elbow / Tee / Cross / Weld ring",
        "models": [
          "316L-CEJ",
          "316L-BJV",
          "316L-BBa"
        ],
        "rows": [
          [
            "316L-CEJ",
            "316L SS",
            "I 微焊接",
            "Ra 5 μin 标准",
            "-198 ~ 538 °C"
          ],
          [
            "316L-BJV",
            "316L SS",
            "I 微焊接",
            "Ra 5 μin 标准",
            "-198 ~ 538 °C"
          ],
          [
            "316L-BBa",
            "316L SS",
            "I 微焊接",
            "Ra 5 μin 标准",
            "-198 ~ 538 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L"
          ],
          "procs": [
            "GP",
            "HP",
            "UHP"
          ],
          "surf": [
            "Ra5",
            "Ra10"
          ]
        }
      },
      {
        "id": "B",
        "nameZh": "B 系列 长焊接接头",
        "nameEn": "Series B Long-Weld",
        "formsZh": "变径直通 / 90° 弯头 / 三通 / 四通",
        "formsEn": "Reducer union / 90° elbow / Tee / Cross",
        "models": [
          "316L-CDV",
          "316L-BBX"
        ],
        "rows": [
          [
            "316L-CDV",
            "316L SS",
            "B 长焊接",
            "Ra 5 μin 标准",
            "-198 ~ 538 °C"
          ],
          [
            "316L-BBX",
            "316L SS",
            "B 长焊接",
            "Ra 5 μin 标准",
            "-198 ~ 538 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L"
          ],
          "procs": [
            "GP",
            "HP",
            "UHP"
          ],
          "surf": [
            "Ra5",
            "Ra10"
          ]
        }
      },
      {
        "id": "G",
        "nameZh": "G 系列 金属面密封接头",
        "nameEn": "Series G Metal Face Seal",
        "formsZh": "金属对金属密封 · 测试孔 · 镀银螺母 · 垫片 316L/CU/NI",
        "formsEn": "Metal-to-metal seal · Test port · Silver-plated nut · Gasket 316L/CU/NI",
        "models": [
          "316L-CFd",
          "316L-CDB"
        ],
        "rows": [
          [
            "316L-CFd",
            "316L SS",
            "金属面密封",
            "Ra 5 μin / Ra 10 可选",
            "538 °C（垫片 204–316 °C）"
          ],
          [
            "316L-CDB",
            "316L SS",
            "金属面密封",
            "Ra 5 μin / Ra 10 可选",
            "538 °C（垫片 204–316 °C）"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "procs": [
            "GP",
            "HP",
            "UHP"
          ],
          "surf": [
            "Ra5",
            "Ra10"
          ]
        }
      },
      {
        "id": "O",
        "nameZh": "O 系列 O 形圈面密封接头",
        "nameEn": "Series O O-Ring Face Seal",
        "formsZh": "O 形圈密封 · 1/8\"–1\" · NPT / SAE 螺纹 · 默认 FKM(90)",
        "formsEn": "O-ring seal · 1/8\"–1\" · NPT / SAE thread · FKM(90) default",
        "models": [
          "O 形圈接头系列"
        ],
        "rows": [
          [
            "O 形圈接头系列",
            "316L SS",
            "O 形圈面密封",
            "Ra 10 μin",
            "-45 ~ 287 °C（依 O 形圈材料）"
          ]
        ],
        "dims": {
          "mats": [
            "316L"
          ],
          "procs": [
            "-"
          ],
          "surf": [
            "Ra10"
          ],
          "oring": [
            "FKM",
            "PTFE",
            "NBR",
            "FFKM",
            "EPDM"
          ]
        }
      }
    ]
  },
  {
    "category": "bellows",
    "source": "波纹管阀目录页/波纹管阀目录页.html",
    "columns": [
      "型号",
      "端口尺寸",
      "压力等级",
      "Cv",
      "工作温度 · 材料"
    ],
    "facets": [
      {
        "key": "cat",
        "items": [
          "BSV1",
          "BSV2"
        ]
      },
      {
        "key": "mat",
        "items": [
          "316L"
        ]
      },
      {
        "key": "end",
        "items": [
          "pending"
        ]
      },
      {
        "key": "pr",
        "items": [
          "ps69",
          "ps172"
        ]
      }
    ],
    "series": [
      {
        "id": "BSV1",
        "nameZh": "BSV1 系列 波纹管阀",
        "nameEn": "Series BSV1 Bellows Valve",
        "formsZh": "液压成型波纹管 · 69.0 bar (1000 psig) · -28 ~ 450 °C",
        "formsEn": "Hydraulic-formed bellows · 69.0 bar (1000 psig) · -28 ~ 450 °C",
        "models": [
          "BSV1"
        ],
        "rows": [
          [
            "BSV1",
            "待确认",
            "69.0 bar (1000 psig)",
            "待确认",
            "-28 ~ 450 °C · 不锈钢阀体 · 液压成型波纹管"
          ]
        ],
        "dims": {
          "cat": [
            "BSV1"
          ],
          "mat": [
            "316L"
          ],
          "end": [
            "pending"
          ],
          "pr": [
            "ps69"
          ]
        }
      },
      {
        "id": "BSV2",
        "nameZh": "BSV2 系列 波纹管阀",
        "nameEn": "Series BSV2 Bellows Valve",
        "formsZh": "上填料二次密封 · 172 bar (2500 psig) · -28 ~ 450 °C",
        "formsEn": "Upper-packing secondary seal · 172 bar (2500 psig) · -28 ~ 450 °C",
        "models": [
          "BSV2"
        ],
        "rows": [
          [
            "BSV2",
            "待确认",
            "172 bar (2500 psig)",
            "待确认",
            "-28 ~ 450 °C · 不锈钢阀体 · 上填料二次密封"
          ]
        ],
        "dims": {
          "cat": [
            "BSV2"
          ],
          "mat": [
            "316L"
          ],
          "end": [
            "pending"
          ],
          "pr": [
            "ps172"
          ]
        }
      }
    ]
  },
  {
    "category": "ball",
    "source": "球阀目录页/球阀目录页.html",
    "columns": [
      "系列",
      "端口尺寸 / 通径",
      "工作压力",
      "Cv",
      "工作温度 · 材料"
    ],
    "facets": [
      {
        "key": "cat",
        "items": [
          "BV1",
          "BV2",
          "BV3",
          "BV4",
          "BV5"
        ]
      },
      {
        "key": "port",
        "items": [
          "thd",
          "pweld",
          "tweld",
          "ferrule"
        ]
      },
      {
        "key": "press",
        "items": [
          "p69",
          "p138",
          "p207",
          "p690"
        ]
      },
      {
        "key": "drive",
        "items": [
          "pneu"
        ]
      }
    ],
    "series": [
      {
        "id": "BV1",
        "nameZh": "BV1 系列 一体式仪表球阀",
        "nameEn": "Series BV1 Integral Instrument Ball Valve",
        "formsZh": "一体式阀体·球形阀杆 · 无死区 · 2–7 通 · 气动可选",
        "formsEn": "Integral body & stem · zero dead volume · 2–7 way · pneumatic opt.",
        "models": [
          "BV1 系列"
        ],
        "rows": [
          [
            "BV1 开关 (2 通)",
            "1/4–1/2\" 管螺纹；1/16\"–3/4\"（3–18 mm）Tube 双卡套",
            "207 bar (3000 psig)",
            "待确认",
            "-54 – 148 °C · 材料待确认"
          ],
          [
            "BV1 切换 (3–7 通)",
            "同上",
            "207 bar (3000 psig)",
            "待确认",
            "-54 – 148 °C · 材料待确认"
          ]
        ],
        "dims": {
          "cat": [
            "BV1"
          ],
          "port": [
            "thd",
            "ferrule"
          ],
          "press": [
            "p207"
          ],
          "drive": [
            "pneu"
          ]
        }
      },
      {
        "id": "BV2",
        "nameZh": "BV2 系列 三片式球阀（低压）",
        "nameEn": "Series BV2 3-Piece Ball Valve (Low Pressure)",
        "formsZh": "三片式 · 1000 psig · 多端接可选",
        "formsEn": "3-piece · 1000 psig · multiple ends",
        "models": [
          "BV2 系列"
        ],
        "rows": [
          [
            "BV2 系列",
            "通径 4.8–25 mm（0.19\"–1\"）；1/8\"–1\" 管螺纹 / Pipe 对焊·插焊；Tube 1/4\"–1\"（6–25 mm）对焊·插焊 / 双卡套",
            "69 bar (1000 psig)",
            "待确认",
            "-28 – 232 °C · 材料待确认"
          ]
        ],
        "dims": {
          "cat": [
            "BV2"
          ],
          "port": [
            "thd",
            "pweld",
            "tweld",
            "ferrule"
          ],
          "press": [
            "p69"
          ],
          "drive": []
        }
      },
      {
        "id": "BV3",
        "nameZh": "BV3 系列 三片式球阀（高压）",
        "nameEn": "Series BV3 3-Piece Ball Valve (High Pressure)",
        "formsZh": "三片式 · 3000 psig · 通径至 38.1 mm · 气动可选",
        "formsEn": "3-piece · 3000 psig · bore to 38.1 mm · pneumatic opt.",
        "models": [
          "BV3 系列"
        ],
        "rows": [
          [
            "BV3 系列",
            "通径 4.8–38.1 mm（0.19\"–1.5\"）；1/8\"–2\" Pipe 对焊·插焊；Tube 1/4\"–2\"（6–50 mm）对焊·插焊 / 双卡套",
            "207 bar (3000 psig)",
            "待确认",
            "-28 – 232 °C · 材料待确认"
          ]
        ],
        "dims": {
          "cat": [
            "BV3"
          ],
          "port": [
            "pweld",
            "tweld",
            "ferrule"
          ],
          "press": [
            "p207"
          ],
          "drive": [
            "pneu"
          ]
        }
      },
      {
        "id": "BV4",
        "nameZh": "BV4 系列 冷拔棒料球阀",
        "nameEn": "Series BV4 Cold-Drawn Bar Ball Valve",
        "formsZh": "嵌入式固定阀座 · 10000 psig · 气动可选",
        "formsEn": "Trunnion seat · 10000 psig · pneumatic opt.",
        "models": [
          "BV4 系列"
        ],
        "rows": [
          [
            "BV4 系列",
            "待确认",
            "690 bar (10000 psig)",
            "待确认",
            "-40 – 232 °C · 材料待确认"
          ]
        ],
        "dims": {
          "cat": [
            "BV4"
          ],
          "port": [],
          "press": [
            "p690"
          ],
          "drive": [
            "pneu"
          ]
        }
      },
      {
        "id": "BV5",
        "nameZh": "BV5 / BV5C 系列 六方棒料球阀",
        "nameEn": "Series BV5 / BV5C Hex-Bar Ball Valve",
        "formsZh": "结构紧凑 · 低扭矩 · 防飞出阀杆 · 可锁定",
        "formsEn": "Compact · low torque · blow-out proof stem · lockable",
        "models": [
          "BV5 系列",
          "BV5C 系列"
        ],
        "rows": [
          [
            "BV5 六方棒料",
            "通径 05/07/10/12/16（锁定孔 4.8 / 5.7 mm）",
            "69 bar (1000 psig)",
            "待确认",
            "-28 – 232 °C · 材料待确认"
          ],
          [
            "BV5C 六方棒料",
            "待确认",
            "138 bar (2000 psig)",
            "待确认",
            "-54 – 204 °C · 材料待确认"
          ]
        ],
        "dims": {
          "cat": [
            "BV5"
          ],
          "port": [],
          "press": [
            "p69",
            "p138"
          ],
          "drive": []
        }
      }
    ]
  },
  {
    "category": "metering",
    "source": "计量阀目录页/计量阀目录页.html",
    "columns": [
      "型号",
      "入口 · 端接",
      "阀杆头 · Cv",
      "最大工作压力",
      "工作温度"
    ],
    "facets": [
      {
        "key": "mat",
        "items": [
          "316",
          "316L"
        ]
      },
      {
        "key": "cvt",
        "items": [
          "G",
          "RG"
        ]
      },
      {
        "key": "end",
        "items": [
          "FMR",
          "MR",
          "F",
          "TW"
        ]
      },
      {
        "key": "seal",
        "items": [
          "Gasket",
          "Weld"
        ]
      }
    ],
    "series": [
      {
        "id": "BSM",
        "nameZh": "BSM 系列 波纹管计量阀",
        "nameEn": "Series BSM Bellows Metering Valve",
        "formsZh": "波纹管密封 · 计量型 / 调节型阀杆头 · 6 圈全开",
        "formsEn": "Bellows-sealed · metering / regulating stem · 6 turns full-open",
        "models": [
          "316-BSM2A-MR4-FMR4-G-W-HP",
          "BSM2A-FMR4-G",
          "BSM2A-FMR8-RG",
          "BSM2A-F4-G",
          "BSM2A-F6M-G",
          "BSM2A-MR4-RG",
          "BSM2A-TW4-G"
        ],
        "rows": [
          [
            "BSM2A-FMR4-G",
            "1/4\" FMR 金属垫片面密封（出口同入口）",
            "G 计量型 · Cv 0.019",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ],
          [
            "BSM2A-FMR8-G",
            "1/2\" FMR 金属垫片面密封",
            "G 计量型 · Cv 0.019",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ],
          [
            "BSM2A-FMR4-RG",
            "1/4\" FMR 金属垫片面密封",
            "RG 调节型 · Cv 0.30",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ],
          [
            "BSM2A-F4-G",
            "1/4\" 卡套端接",
            "G 计量型 · Cv 0.019",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ],
          [
            "BSM2A-F6M-G",
            "6 mm 公制卡套端接",
            "G 计量型 · Cv 0.019",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ],
          [
            "BSM2A-MR4-G",
            "1/4\" MR 整体外螺纹金属面密封",
            "G 计量型 · Cv 0.019",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ],
          [
            "BSM2A-MR4-RG",
            "1/4\" MR 整体外螺纹金属面密封",
            "RG 调节型 · Cv 0.30",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ],
          [
            "BSM2A-TW4-G",
            "1/4\" 承插焊 / 3/8\" 对焊端接",
            "G 计量型 · Cv 0.019",
            "48.2 bar (700 psig)",
            "-28 ~ 482 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316",
            "316L"
          ],
          "ends": [
            "FMR",
            "MR",
            "F",
            "TW"
          ],
          "cvt": [
            "G",
            "RG"
          ],
          "seal": [
            "Gasket",
            "Weld"
          ]
        }
      }
    ]
  },
  {
    "category": "filter",
    "source": "过滤器目录页/过滤器目录页.html",
    "columns": [
      "型号",
      "端口 · 端接",
      "过滤精度",
      "额定流量",
      "最大工作压力 · 材料"
    ],
    "facets": [
      {
        "key": "media",
        "items": [
          "sintered",
          "ceramic",
          "ssmem"
        ]
      },
      {
        "key": "prec",
        "items": [
          "coarse",
          "ultra"
        ]
      },
      {
        "key": "port",
        "items": [
          "F",
          "MR",
          "NPT"
        ]
      },
      {
        "key": "mat",
        "items": [
          "316L",
          "6V"
        ]
      },
      {
        "key": "clean",
        "items": [
          "GP",
          "HP",
          "UHP"
        ]
      }
    ],
    "series": [
      {
        "id": "GAS",
        "nameZh": "气体过滤器 · 高纯气体过滤家族",
        "nameEn": "Gas Filters · High-Purity Family",
        "formsZh": "粉末烧结 / 陶瓷 / 316L 不锈钢膜 · 特气与超高纯气体",
        "formsEn": "Sintered / ceramic / 316L membrane · specialty & UHP gas",
        "models": [
          "气体过滤器 FT4 / FT5 / FT6 系列"
        ],
        "rows": [
          [
            "气体过滤器 系列总览",
            "1/8\"–1/2\" F 双卡套 / MR / NPT",
            "2.5 nm – 80 μm",
            "15 – 300 SLPM",
            "真空 – 210 bar · 316L / 316L VAR"
          ]
        ],
        "dims": {
          "media": [
            "sintered",
            "ceramic",
            "ssmem"
          ],
          "prec": [
            "coarse",
            "ultra"
          ],
          "port": [
            "F",
            "MR",
            "NPT"
          ],
          "mat": [
            "316L",
            "6V"
          ],
          "clean": [
            "GP",
            "HP",
            "UHP"
          ]
        }
      },
      {
        "id": "FT4",
        "nameZh": "FT4 系列 粉末烧结滤芯过滤器",
        "nameEn": "Series FT4 Sintered-Powder Filter",
        "formsZh": "316L 金属粉末烧结 · 紧凑结构 · 多精度",
        "formsEn": "316L sintered powder · compact · multiple ratings",
        "models": [
          "316L-FT4-MR4-05-HP",
          "FT4-F2",
          "FT4-F4",
          "FT4-MR4",
          "FT4-MR8"
        ],
        "rows": [
          [
            "FT4-F2",
            "1/8\" 双卡套 F · 进出口同径",
            "0.5–80 μm（05/2/5/15/40/60/80）",
            "过滤面积 2",
            "207 bar (3000 psig) · 316L SS 粉末烧结"
          ],
          [
            "FT4-F4",
            "1/4\" 双卡套 F",
            "0.5–80 μm",
            "过滤面积 4",
            "207 bar · 316L SS 粉末烧结"
          ],
          [
            "FT4-F8",
            "1/2\" 双卡套 F",
            "0.5–80 μm",
            "过滤面积 8",
            "207 bar · 316L SS 粉末烧结"
          ],
          [
            "FT4-MR4",
            "1/4\" MR 金属面密封",
            "0.5–80 μm",
            "过滤面积 4",
            "207 bar · 316L SS 粉末烧结"
          ],
          [
            "FT4-MR8",
            "1/2\" MR 金属面密封",
            "0.5–80 μm",
            "过滤面积 8",
            "207 bar · 316L SS 粉末烧结"
          ]
        ],
        "dims": {
          "media": [
            "sintered"
          ],
          "prec": [
            "coarse"
          ],
          "port": [
            "F",
            "MR",
            "NPT"
          ],
          "mat": [
            "316L",
            "6V"
          ],
          "clean": [
            "GP",
            "HP"
          ]
        }
      },
      {
        "id": "FT5",
        "nameZh": "FT5 系列 陶瓷滤芯过滤器",
        "nameEn": "Series FT5 Ceramic Filter",
        "formsZh": "高纯陶瓷滤芯 · 极低脱气 · 2.5 nm 绝对精度",
        "formsEn": "High-purity ceramic element · ultra-low outgas · 2.5 nm absolute",
        "models": [
          "316L-FT5-MR4-F120-UHP",
          "FT5-MR4-F60",
          "FT5-MR8-F120",
          "FT5-MR4-F300"
        ],
        "rows": [
          [
            "316L-FT5-MR4-F60",
            "1/4\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "60 SLPM",
            "207 bar @20°C · 316L / 高纯陶瓷滤芯"
          ],
          [
            "316L-FT5-MR8-F60",
            "1/2\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "60 SLPM",
            "207 bar · 316L / 高纯陶瓷滤芯"
          ],
          [
            "316L-FT5-MR4-F120",
            "1/4\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "120 SLPM",
            "207 bar · 316L / 高纯陶瓷滤芯"
          ],
          [
            "316L-FT5-MR4-F200",
            "1/4\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "200 SLPM",
            "207 bar · 316L / 高纯陶瓷滤芯"
          ],
          [
            "316L-FT5-MR8-F300",
            "1/2\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "300 SLPM",
            "207 bar · 316L / 高纯陶瓷滤芯"
          ]
        ],
        "dims": {
          "media": [
            "ceramic"
          ],
          "prec": [
            "ultra"
          ],
          "port": [
            "MR"
          ],
          "mat": [
            "316L",
            "6V"
          ],
          "clean": [
            "UHP"
          ]
        }
      },
      {
        "id": "FT6",
        "nameZh": "FT6 系列 不锈钢滤芯过滤器",
        "nameEn": "Series FT6 Stainless-Membrane Filter",
        "formsZh": "全 316L 紧凑结构 · 高温高压 · 2.5 nm",
        "formsEn": "All-316L compact · high temp/pressure · 2.5 nm",
        "models": [
          "316L-FT6-MR4-F120-UHP",
          "FT6-MR4-F15",
          "FT6-MR8-F120",
          "FT6-MR4-F300"
        ],
        "rows": [
          [
            "316L-FT6-MR4-F15",
            "1/4\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "15 SLPM",
            "210 bar @20°C · 316L 不锈钢滤芯"
          ],
          [
            "316L-FT6-MR4-F120",
            "1/4\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "120 SLPM",
            "210 bar · 316L 不锈钢滤芯"
          ],
          [
            "316L-FT6-MR8-F120",
            "1/2\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "120 SLPM",
            "210 bar · 316L 不锈钢滤芯"
          ],
          [
            "316L-FT6-MR4-F300",
            "1/4\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "300 SLPM",
            "210 bar · 316L 不锈钢滤芯"
          ],
          [
            "316L-FT6-MR8-F300",
            "1/2\" MR 金属面密封",
            "0.0025 μm（2.5 nm）",
            "300 SLPM",
            "210 bar · 316L 不锈钢滤芯"
          ]
        ],
        "dims": {
          "media": [
            "ssmem"
          ],
          "prec": [
            "ultra"
          ],
          "port": [
            "MR"
          ],
          "mat": [
            "316L",
            "6V"
          ],
          "clean": [
            "UHP"
          ]
        }
      }
    ]
  },
  {
    "category": "needle",
    "source": "针阀目录页/针阀目录页.html",
    "columns": [
      "型号",
      "端口尺寸",
      "压力等级",
      "Cv",
      "工作温度 · 填料"
    ],
    "facets": [
      {
        "key": "cat",
        "items": [
          "NV1",
          "NV3",
          "NV5"
        ]
      },
      {
        "key": "mat",
        "items": [
          "316L"
        ]
      },
      {
        "key": "end",
        "items": [
          "pending"
        ]
      },
      {
        "key": "pr",
        "items": [
          "ps3000",
          "ps5000",
          "ps6000",
          "ps10000"
        ]
      }
    ],
    "series": [
      {
        "id": "NV1",
        "nameZh": "NV1 系列 锻造阀体针阀",
        "nameEn": "Series NV1 Forged-Body Needle Valve",
        "formsZh": "一体式锻造阀体 · 两截式阀杆 · 6000 / 10000 psig",
        "formsEn": "One-piece forged body · two-piece stem · 6000 / 10000 psig",
        "models": [
          "NV1",
          "NV1H"
        ],
        "rows": [
          [
            "NV1",
            "待确认",
            "6000 psig（NV1H 10000 psig）",
            "待确认",
            "PTFE / PEEK / 石墨填料；-54 ~ 649 °C"
          ]
        ],
        "dims": {
          "cat": [
            "NV1"
          ],
          "mat": [
            "316L"
          ],
          "end": [
            "pending"
          ],
          "pr": [
            "ps6000",
            "ps10000"
          ]
        }
      },
      {
        "id": "NV3",
        "nameZh": "NV3 系列 整体式阀帽针阀",
        "nameEn": "Series NV3 Integral-Bonnet Needle Valve",
        "formsZh": "碟簧自动补偿填料 · 结构紧凑 · 3000 / 5000 psig",
        "formsEn": "Disc-spring packing compensation · compact · 3000 / 5000 psig",
        "models": [
          "NV3",
          "NV3H"
        ],
        "rows": [
          [
            "NV3",
            "待确认",
            "3000 psig（NV3H 5000 psig）",
            "待确认",
            "PTFE / PEEK 填料；-54 ~ 260 °C"
          ]
        ],
        "dims": {
          "cat": [
            "NV3"
          ],
          "mat": [
            "316L"
          ],
          "end": [
            "pending"
          ],
          "pr": [
            "ps3000",
            "ps5000"
          ]
        }
      },
      {
        "id": "NV5",
        "nameZh": "NV5 系列 活接阀帽针阀",
        "nameEn": "Series NV5 Union-Bonnet Needle Valve",
        "formsZh": "联合阀帽防分解 · 全开背密封 · 6000 / 10000 psig",
        "formsEn": "Union bonnet against blow-out · back-seat full-open · 6000 / 10000 psig",
        "models": [
          "NV5",
          "NV5H"
        ],
        "rows": [
          [
            "NV5",
            "待确认",
            "6000 psig（NV5H 10000 psig）",
            "待确认",
            "PTFE / PEEK / 石墨填料；-54 ~ 649 °C"
          ]
        ],
        "dims": {
          "cat": [
            "NV5"
          ],
          "mat": [
            "316L"
          ],
          "end": [
            "pending"
          ],
          "pr": [
            "ps6000",
            "ps10000"
          ]
        }
      }
    ]
  },
  {
    "category": "manifold",
    "source": "阀组目录页/阀组目录页.html",
    "columns": [
      "系列 / 类型",
      "端口 · 端接",
      "工作压力",
      "Cv",
      "温度 · 材料"
    ],
    "facets": [
      {
        "key": "type",
        "items": [
          "MAN",
          "2V"
        ]
      },
      {
        "key": "code",
        "items": [
          "2D",
          "2R",
          "2DH",
          "2RH"
        ]
      },
      {
        "key": "mat",
        "items": [
          "316L"
        ]
      },
      {
        "key": "port",
        "items": [
          "NPT"
        ]
      }
    ],
    "series": [
      {
        "id": "MAN",
        "nameZh": "仪表阀组",
        "nameEn": "Instrument Manifold",
        "formsZh": "集成切断 / 泄放 · 仪表安装",
        "formsEn": "Isolation / vent · instrument mounting",
        "models": [
          "仪表阀组"
        ],
        "rows": [
          [
            "仪表阀组",
            "NPT 螺纹",
            "待确认",
            "待确认",
            "316 不锈钢 · 待确认"
          ]
        ],
        "dims": {
          "type": [
            "MAN"
          ],
          "code": [],
          "mats": [
            "316L"
          ],
          "ports": [
            "NPT"
          ]
        }
      },
      {
        "id": "2V",
        "nameZh": "二阀组 2D / 2R / 2DH / 2RH",
        "nameEn": "Two-Valve Manifold 2D / 2R / 2DH / 2RH",
        "formsZh": "双阀集成 · 仪表安装",
        "formsEn": "Dual-valve · instrument mounting",
        "models": [
          "2D",
          "2R",
          "2DH",
          "2RH"
        ],
        "rows": [
          [
            "2D",
            "NPT 螺纹",
            "待确认",
            "待确认",
            "316 不锈钢 · 待确认"
          ],
          [
            "2R",
            "NPT 螺纹",
            "待确认",
            "待确认",
            "316 不锈钢 · 待确认"
          ],
          [
            "2DH",
            "NPT 螺纹",
            "待确认",
            "待确认",
            "316 不锈钢 · 待确认"
          ],
          [
            "2RH",
            "NPT 螺纹",
            "待确认",
            "待确认",
            "316 不锈钢 · 待确认"
          ]
        ],
        "dims": {
          "type": [
            "2V"
          ],
          "code": [
            "2D",
            "2R",
            "2DH",
            "2RH"
          ],
          "mats": [
            "316L"
          ],
          "ports": [
            "NPT"
          ]
        }
      }
    ]
  },
  {
    "category": "diaphragm",
    "source": "隔膜阀目录页/隔膜阀目录页.html",
    "columns": [
      "型号",
      "端口 · 端接",
      "工作压力",
      "Cv",
      "工作温度 · 阀座"
    ],
    "facets": [
      {
        "key": "drive",
        "items": [
          "man",
          "NC",
          "NO",
          "MNC",
          "MNO"
        ]
      },
      {
        "key": "seat",
        "items": [
          "PCTFE",
          "PFA",
          "Vespel"
        ]
      },
      {
        "key": "clean",
        "items": [
          "GP",
          "HP",
          "UHP"
        ]
      },
      {
        "key": "mat",
        "items": [
          "316L",
          "6V",
          "6VV"
        ]
      },
      {
        "key": "port",
        "items": [
          "FMR",
          "MR",
          "SMR",
          "TB",
          "F"
        ]
      }
    ],
    "series": [
      {
        "id": "ALD",
        "nameZh": "ALD 系列 原子层沉积隔膜阀",
        "nameEn": "Series ALD Atomic Layer Deposition",
        "formsZh": "模块化表面安装 · 面密封 · 管对焊端接",
        "formsEn": "Modular surface mount · face seal · butt weld",
        "models": [
          "6V-ALD33A-FMR4-FMR4-MR4-NC-VS-UHP",
          "ALD32A-FMR4",
          "ALD62A-FMR8",
          "ALD3-CS18-2"
        ],
        "rows": [
          [
            "ALD32A-FMR4",
            "1/4\" FMR 面密封",
            "真空 – 10 bar",
            "0.27",
            "0 – 120 °C"
          ],
          [
            "ALD62A-FMR8",
            "1/2\" FMR 面密封",
            "真空 – 10 bar",
            "0.62",
            "0 – 120 °C"
          ],
          [
            "ALD3-CS18-2",
            "1.125\" C-Seal 两孔",
            "真空 – 10 bar",
            "0.27",
            "0 – 120 °C"
          ],
          [
            "ALD6-CS24H-2",
            "1.5\" C-Seal 两孔 高流量",
            "真空 – 10 bar",
            "0.62",
            "0 – 120 °C"
          ],
          [
            "ALD3T2A-FMR4",
            "1/4\" FMR · 耐热型",
            "真空 – 10 bar",
            "0.27",
            "0 – 200 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "NC",
            "NO"
          ],
          "seats": [
            "PFA"
          ],
          "ports": [
            "FMR",
            "MR",
            "SMR",
            "TB"
          ]
        }
      },
      {
        "id": "DV1",
        "nameZh": "DV1 系列 低压小流量隔膜阀",
        "nameEn": "Series DV1 Low-Pressure Low-Flow",
        "formsZh": "内部容积小 · 全封闭阀座 · 超高纯小流量",
        "formsEn": "Low internal volume · encapsulated seat · UHP low flow",
        "models": [
          "316L-DV13A-FMR4-FMR4-MR4-NC-PA-HP",
          "DV12A-MR4",
          "DV12A-FMR4",
          "DV12A-TB4"
        ],
        "rows": [
          [
            "DV12A-MR4",
            "1/4\" MR 外螺纹面密封",
            "真空 – 17.2 bar",
            "0.3",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV12A-FMR4",
            "1/4\" FMR 面密封",
            "真空 – 17.2 bar",
            "0.3",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV12A-TB4",
            "1/4\" 管对焊",
            "真空 – 17.2 bar",
            "0.3",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV12A-F6M",
            "6 mm 卡套",
            "真空 – 17.2 bar",
            "0.3",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "man",
            "NC",
            "NO",
            "MNC",
            "MNO"
          ],
          "seats": [
            "PCTFE",
            "PFA"
          ],
          "ports": [
            "FMR",
            "MR",
            "SMR",
            "TB",
            "F"
          ]
        }
      },
      {
        "id": "DV2",
        "nameZh": "DV2 系列 低压中流量隔膜阀",
        "nameEn": "Series DV2 Low-Pressure Mid-Flow",
        "formsZh": "低压大通径 · 手动 / 气动",
        "formsEn": "Low pressure, larger bore, manual / pneumatic",
        "models": [
          "316L-DV23A-FMR8-FMR8-MR8-NC-PA-HP",
          "DV22A-MR8",
          "DV22A-FMR8",
          "DV22A-F10M"
        ],
        "rows": [
          [
            "DV22A-MR8",
            "1/2\" MR 外螺纹面密封",
            "真空 – 17.2 bar（手动）",
            "0.65",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV22A-FMR8",
            "1/2\" FMR 面密封",
            "真空 – 17.2 bar（手动）",
            "0.65",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV22A-TB8",
            "1/2\" 管对焊",
            "真空 – 17.2 bar（手动）",
            "0.65",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV22A-F10M",
            "10 mm 卡套",
            "真空 – 17.2 bar（手动）",
            "0.65",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "man",
            "NC",
            "NO",
            "MNC",
            "MNO"
          ],
          "seats": [
            "PCTFE",
            "PFA"
          ],
          "ports": [
            "FMR",
            "MR",
            "SMR",
            "TB",
            "F"
          ]
        }
      },
      {
        "id": "DV3",
        "nameZh": "DV3 系列 低压大流量隔膜阀",
        "nameEn": "Series DV3 Low-Pressure High-Flow",
        "formsZh": "联结式膜片全开 · 金属对金属密封 · 直通",
        "formsEn": "Linked diaphragm full-open · metal-to-metal seal · straight",
        "models": [
          "316L-DV32A-FMR12-SMR12-NC-PI-HP",
          "DV32A-SMR8",
          "DV32A-FMR12",
          "DV32A-FMR16"
        ],
        "rows": [
          [
            "DV32A-SMR8",
            "1/2\" SMR 可旋转外螺纹",
            "真空 – 17.2 bar",
            "2.8",
            "PCTFE -40–70 °C · PI -23–121 °C"
          ],
          [
            "DV32A-FMR12",
            "3/4\" FMR 面密封",
            "真空 – 17.2 bar",
            "2.8",
            "PCTFE -40–70 °C · PI -23–121 °C"
          ],
          [
            "DV32A-FMR16",
            "1\" FMR 面密封",
            "真空 – 17.2 bar",
            "2.8",
            "PCTFE -40–70 °C · PI -23–121 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "man",
            "NC",
            "NO"
          ],
          "seats": [
            "PCTFE",
            "Vespel"
          ],
          "ports": [
            "FMR",
            "SMR"
          ]
        }
      },
      {
        "id": "DV4",
        "nameZh": "DV4 系列 高压小流量隔膜阀",
        "nameEn": "Series DV4 High-Pressure Low-Flow",
        "formsZh": "3000 psig · 全封闭阀座",
        "formsEn": "3000 psig · encapsulated seat",
        "models": [
          "316L-DV43A-FMR4-FMR4-MR4-NC-PI-HP",
          "DV42A-MR4",
          "DV42A-FMR4",
          "DV42A-F8M"
        ],
        "rows": [
          [
            "DV42A-MR4",
            "1/4\" MR 外螺纹面密封",
            "真空 – 207 bar",
            "0.26",
            "PCTFE -23–65 °C · PI -10–150 °C"
          ],
          [
            "DV42A-FMR4",
            "1/4\" FMR 面密封",
            "真空 – 207 bar",
            "0.26",
            "PCTFE -23–65 °C · PI -10–150 °C"
          ],
          [
            "DV42A-TB6",
            "3/8\" 管对焊",
            "真空 – 207 bar",
            "0.26",
            "PCTFE -23–65 °C · PI -10–150 °C"
          ],
          [
            "DV42A-F8M",
            "8 mm 卡套",
            "真空 – 207 bar",
            "0.26",
            "PCTFE -23–65 °C · PI -10–150 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "man",
            "NC",
            "NO",
            "MNC",
            "MNO"
          ],
          "seats": [
            "PCTFE",
            "Vespel"
          ],
          "ports": [
            "FMR",
            "MR",
            "SMR",
            "TB",
            "F"
          ]
        }
      },
      {
        "id": "DV5",
        "nameZh": "DV5 系列 高压中流量隔膜阀",
        "nameEn": "Series DV5 High-Pressure Mid-Flow",
        "formsZh": "3500 psig · 最大背压 1500 psig",
        "formsEn": "3500 psig · 1500 psig max back pressure",
        "models": [
          "316L-DV53A-FMR8-FMR8-MR8-NC-PI-HP",
          "DV52A-MR8",
          "DV52A-FMR8",
          "DV52A-F10M"
        ],
        "rows": [
          [
            "DV52A-MR8",
            "1/2\" MR 外螺纹面密封",
            "真空 – 241 bar（手动）",
            "0.8",
            "PCTFE -23–65 °C · PI -23–121 °C"
          ],
          [
            "DV52A-FMR8",
            "1/2\" FMR 面密封",
            "真空 – 241 bar（手动）",
            "0.8",
            "PCTFE -23–65 °C · PI -23–121 °C"
          ],
          [
            "DV52A-TB8",
            "1/2\" 管对焊",
            "真空 – 241 bar（手动）",
            "0.8",
            "PCTFE -23–65 °C · PI -23–121 °C"
          ],
          [
            "DV52A-F10M",
            "10 mm 卡套",
            "真空 – 241 bar（手动）",
            "0.8",
            "PCTFE -23–65 °C · PI -23–121 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "man",
            "NC",
            "NO",
            "MNC",
            "MNO"
          ],
          "seats": [
            "PCTFE",
            "Vespel"
          ],
          "ports": [
            "FMR",
            "MR",
            "SMR",
            "TB",
            "F"
          ]
        }
      },
      {
        "id": "DV6",
        "nameZh": "DV6 系列 中压中流量隔膜阀",
        "nameEn": "Series DV6 Medium-Pressure Mid-Flow",
        "formsZh": "300 psig · 手动 / 气动",
        "formsEn": "300 psig · manual / pneumatic",
        "models": [
          "316L-DV63A-FMR8-FMR8-MR8-NC-PA-HP",
          "DV62A-MR8",
          "DV62A-FMR8",
          "DV62A-TB8"
        ],
        "rows": [
          [
            "DV62A-MR8",
            "1/2\" MR 外螺纹面密封",
            "真空 – 20.7 bar",
            "0.65",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV62A-FMR8",
            "1/2\" FMR 面密封",
            "真空 – 20.7 bar",
            "0.65",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ],
          [
            "DV62A-TB8",
            "1/2\" 管对焊",
            "真空 – 20.7 bar",
            "0.65",
            "PCTFE -23–65 °C · PFA -23–150 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "man",
            "NC",
            "NO",
            "MNC",
            "MNO"
          ],
          "seats": [
            "PCTFE",
            "PFA"
          ],
          "ports": [
            "FMR",
            "MR",
            "SMR",
            "TB"
          ]
        }
      },
      {
        "id": "DV7",
        "nameZh": "DV7 系列 高压弹簧隔膜阀",
        "nameEn": "Series DV7 High-Pressure Spring-Return",
        "formsZh": "阀杆弹簧复位 · 真空可靠工作 · 3500 psig",
        "formsEn": "Spring-return stem · vacuum rated · 3500 psig",
        "models": [
          "316L-DV73A-FMR4-FMR4-MR4-NC-PI-HP",
          "DV72A-MR4",
          "DV72A-FMR4",
          "DV72A-TB6"
        ],
        "rows": [
          [
            "DV72A-MR4",
            "1/4\" MR 外螺纹面密封",
            "真空 – 241 bar",
            "条形 0.14 · 圆形 0.3",
            "PCTFE -73–121 °C · PI -73–160 °C"
          ],
          [
            "DV72A-FMR4",
            "1/4\" FMR 面密封",
            "真空 – 241 bar",
            "条形 0.14 · 圆形 0.3",
            "PCTFE -73–121 °C · PI -73–160 °C"
          ],
          [
            "DV72A-TB6",
            "3/8\" 管对焊",
            "真空 – 241 bar",
            "条形 0.14 · 圆形 0.3",
            "PCTFE -73–121 °C · PI -73–160 °C"
          ]
        ],
        "dims": {
          "mats": [
            "316L",
            "6V",
            "6VV"
          ],
          "cleans": [
            "GP",
            "HP",
            "UHP"
          ],
          "drives": [
            "man",
            "NC",
            "NO",
            "MNC",
            "MNO"
          ],
          "seats": [
            "PCTFE",
            "Vespel"
          ],
          "ports": [
            "FMR",
            "MR",
            "TB",
            "F"
          ]
        }
      }
    ]
  }
];

/** 按系列代号取手册规格（如 `DV1`、`BV2`、`FT4`） */
export function findSeriesSpec(seriesId: string): { category: ManualCategorySpec; series: ManualSeriesSpec } | null {
  const t = String(seriesId || "").toUpperCase();
  for (const c of MANUAL_SPECS) for (const s of c.series) if (s.id.toUpperCase() === t) return { category: c, series: s };
  return null;
}
