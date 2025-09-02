# 终端Tab补全测试用例

## ✅ 测试环境准备

```bash
# 创建测试文件
echo "test" > package.json
echo "test" > package-lock.json
echo "test" > README.md
echo "test" > README.txt
mkdir -p src/components src/hooks src/utils
```

## 📝 测试场景

### Test 1: 公共前缀补全
```bash
输入: cat p[Tab]
期望: cat package       # 补全到公共前缀
输入: cat package[Tab]
期望: (无反应/蜂鸣)     # 无法继续补全
输入: cat package[Tab][Tab]
期望: 显示菜单:
  📄 package.json
  📄 package-lock.json
```

### Test 2: 唯一匹配
```bash
输入: cat RE[Tab]
期望: cat README        # 补全到公共前缀
输入: cat README.[Tab]
期望: (无反应)          # 仍有歧义
输入: cat README.m[Tab]
期望: cat README.md     # 唯一匹配，直接完成
```

### Test 3: 目录补全
```bash
输入: cd s[Tab]
期望: cd src/           # 唯一匹配，加斜杠
输入: cd src/[Tab]
期望: (无反应)          # 多个选项
输入: cd src/[Tab][Tab]
期望: 显示菜单:
  📁 components/
  📁 hooks/
  📁 utils/
```

### Test 4: 命令补全
```bash
输入: /he[Tab]
期望: /help             # 唯一匹配
输入: /[Tab]
期望: (无反应)          # 需要双Tab
输入: /[Tab][Tab]
期望: 显示所有命令
```

### Test 5: Agent补全
```bash
输入: @agent-c[Tab]
期望: @agent-code-writer  # 如果唯一
或
期望: @agent-c           # 补全公共前缀
输入: @agent-c[Tab][Tab]
期望: 显示匹配的agents
```

### Test 6: 连续补全
```bash
输入: cd src/c[Tab]
期望: cd src/components/  # 补全
输入: 继续输入 [Tab]
期望: 可以继续补全下一级
```

## 🔍 验证要点

### 核心行为
- [ ] 第一次Tab尝试补全，不显示菜单
- [ ] 第二次Tab才显示菜单
- [ ] 公共前缀自动补全
- [ ] 唯一匹配立即完成
- [ ] 无匹配时不响应（蜂鸣）

### 状态管理
- [ ] Tab状态在500ms后重置
- [ ] 输入改变时重置状态
- [ ] 菜单显示后Tab选择项目

### 边界情况
- [ ] 空前缀需要双Tab
- [ ] 文件名包含空格的处理
- [ ] 路径中的特殊字符

## 🎯 预期改进

### Before (现在的问题)
```
cat p[Tab]
▸ package.json      # 立即显示菜单 ❌
  package-lock.json
```

### After (改进后)
```
cat p[Tab]
cat package         # 补全公共前缀 ✅
cat package[Tab][Tab]
package.json  package-lock.json  # 双Tab显示 ✅
```

## 📊 行为对比表

| 场景 | Bash/Zsh | 旧实现 | 新实现 |
|------|----------|--------|--------|
| 多个匹配+Tab | 补全公共前缀 | 显示菜单 | 补全公共前缀 ✅ |
| 多个匹配+Tab+Tab | 显示选项 | N/A | 显示选项 ✅ |
| 唯一匹配+Tab | 立即完成 | 立即完成 | 立即完成 ✅ |
| 无匹配+Tab | 蜂鸣 | 无反应 | 蜂鸣 ✅ |
| 目录补全 | 加斜杠 | 加斜杠 | 加斜杠 ✅ |

## 🚀 性能指标

- Tab响应时间: <50ms
- 双Tab检测窗口: 500ms
- 公共前缀计算: O(n*m) 其中n=建议数，m=平均长度

## 📝 用户体验提升

1. **减少操作次数**: 公共前缀补全减少输入
2. **符合肌肉记忆**: 与终端行为100%一致
3. **渐进式显示**: 只在需要时显示菜单
4. **智能判断**: 根据上下文做最优选择