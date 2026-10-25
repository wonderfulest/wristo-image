# Wristo Image

普通图片工具在浏览器中运行，无需登录。AI 图片编辑通过 Wristo SSO（`image` 客户端，PKCE）登录后使用同一 Wristo 积分账户。默认每次 3 积分，管理员在 Dashboard → AI 模型配置 → Wristo Image 调整价格。提交前显示实时余额和费用，处理失败退款，撤销或下载不再次扣费。

## 本地验证

- `npm test`
- `npm run build`
- `npm run dev`（端口 3007；主 API 默认代理到 `http://127.0.0.1:8088`，可设置 `WRISTO_API_PROXY`）

登录使用新窗口保留当前画布；浏览器需要允许该站点弹窗。SSO 回调为 `/auth/callback`，需同时发布 SSO 的 image 客户端识别与主 API 的回调白名单。

## 服务端发布依赖

需要协调发布 `wristo-api`、`wristo-cn-api`、`wristo-sso`、`wristo-dashboard` 和本项目。遵循工作区的本地验证、提交、推送、服务器 Git 拉取规则。

1. 在主 API 和国内 API 的独立密钥配置中设置相同的 `WRISTO_IMAGE_SERVICE_SECRET`（至少 32 字符随机密钥）。不要将值提交到 Git。主 API 的 `WRISTO_IMAGE_SERVICE_URL` 默认 `https://api.wristo.cn`。
2. 主 API 运行 V209 迁移，建立任务和归属记录。扣费与记录原子提交；后台每 15 秒尝试恢复未完成任务，10 分钟后仍未完成则进入退款处理。短暂轮询失败会重试。
3. 国内 API 对旧公共路径及新内部路径统一验证服务密钥。未配置时拒绝 AI 请求，不回退到匿名调用。应与主 API、图片站的切换安排维护窗口，避免旧前端短暂不可用。
4. 图片站上传、查询、结果下载均走主 API；不要保留到国内公共 AI 接口的直连转发。Vercel rewrites 已包含主 API 和 SSO 兑换路径。
5. 登录后验收一次成功扣 3 分、失败退款、余额不足拒绝、匿名直调拒绝、重复请求不重复扣款。真实服务验收会调用供应商并产生费用。

任务结果沿用国内服务的临时下载有效期（默认 30 分钟）；请及时下载。本地测试通过不代表已经发布或真实扣费验证完成。
