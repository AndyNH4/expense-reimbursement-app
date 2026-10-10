# 财务报销系统

React + TypeScript + Vite + Tailwind CSS + shadcn/ui 实现的财务报销演示系统。

## 功能

- 发票文件上传（图片 / PDF / OFD）与在线预览
- 发票真伪三层核验：本地结构化校验（格式 / 日期 / 金额勾稽 / 校验位）→ 重复报销检测 → 税局查验通道（演示环境为模拟通道，可替换为真实查验 API）
- 报销单提交与审批流（待审批 / 批准 / 驳回 / 打款）
- 工作台统计与月度报销图表

数据保存在浏览器 localStorage。线上地址由 GitHub Pages 自动部署。

## 本地运行

```bash
npm install
npm run dev
```
