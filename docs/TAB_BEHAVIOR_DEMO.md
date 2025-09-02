# Tab 补全行为演示

## 🎯 核心洞察：Tab的两个职责

### 1️⃣ Tab = "尽可能补全"
### 2️⃣ Tab Tab = "显示所有选项"

---

## 📱 实际例子（假设有文件：package.json, package-lock.json）

### ✅ 标准终端的智慧
```bash
cat p[Tab]
# 🤔 思考：有 package.json, package-lock.json, public/
# 💡 决策：补全到公共前缀
cat package█

cat package[Tab]  
# 🤔 思考：还是有歧义
# 💡 决策：不动（或蜂鸣）

cat package[Tab][Tab]
# 🤔 思考：用户需要看选项了
# 💡 决策：显示所有
package.json  package-lock.json

cat package.j[Tab]
# 🤔 思考：唯一匹配！
# 💡 决策：直接补全
cat package.json█
```

### ❌ 我们现在的问题
```bash
cat p[Tab]
# 😵 立即显示菜单
▸ package.json
  package-lock.json  
  public/
# 用户：我只是想补全啊，不是要选择！
```

---

## 🧠 终端的补全决策树

```
按下 Tab
    ↓
有几个匹配？
    ↓
┌────────┼────────┐
0个      1个      多个
↓        ↓        ↓
蜂鸣    补全完成   有公共前缀？
                   ↓
              ┌────┴────┐
              有        无
              ↓         ↓
          补全前缀   是第二次Tab？
                      ↓
                 ┌────┴────┐
                 是        否
                 ↓         ↓
             显示菜单    蜂鸣
```

---

## 💭 为什么这样设计？

### 效率原则
- **最少按键**: 能补全就补全，不要问
- **渐进显示**: 只在需要时才显示选项
- **智能判断**: 根据上下文做最合理的事

### 用户心智模型
```
Tab = "帮我补全"
Tab Tab = "我需要看看有什么选项"
```

---

## 🔨 我们需要的改动

### 当前代码（过于简单）
```typescript
if (key.tab) {
  if (suggestions.length > 1) {
    showMenu()  // ❌ 太早了！
  }
}
```

### 应该的代码（智能判断）
```typescript
if (key.tab) {
  const now = Date.now()
  const isDoubleTab = (now - lastTabTime) < 300
  
  if (suggestions.length === 0) {
    beep()
  } else if (suggestions.length === 1) {
    complete(suggestions[0])
  } else {
    // 多个匹配
    const commonPrefix = findCommonPrefix(suggestions)
    const currentWord = getCurrentWord()
    
    if (commonPrefix.length > currentWord.length) {
      // 可以补全到公共前缀
      complete(commonPrefix)
    } else if (isDoubleTab) {
      // 第二次Tab，显示菜单
      showMenu()
    } else {
      // 第一次Tab，但没有可补全的
      beep()
    }
  }
  
  lastTabTime = now
}
```

---

## 🎮 交互示例

### 场景：输入命令参数
```bash
# 文件: README.md, README.txt, package.json

$ cat R[Tab]
$ cat README      # 补全公共前缀

$ cat README[Tab]
*beep*            # 无法继续补全

$ cat README[Tab][Tab]
README.md  README.txt   # 显示选项

$ cat README.m[Tab]
$ cat README.md   # 唯一匹配，完成
```

### 场景：路径导航
```bash
$ cd s[Tab]
$ cd src/         # 唯一匹配，补全+加斜杠

$ cd src/[Tab][Tab]
components/  hooks/  utils/   # 继续显示下级

$ cd src/c[Tab]
$ cd src/components/   # 继续补全
```

---

## 📊 影响分析

| 操作 | 按键次数（现在） | 按键次数（改进后） | 节省 |
|------|-----------------|-------------------|------|
| 输入 package.json | 5次(p+Tab+↓+↓+Enter) | 3次(pa+Tab+.j+Tab) | 40% |
| 进入 src/components | 4次(s+Tab+Enter+c+Tab) | 2次(s+Tab+c+Tab) | 50% |
| 选择多个选项之一 | 3次(Tab+↓+Enter) | 4次(Tab+Tab+↓+Enter) | -33% |

**平均效率提升：~30%**

---

## 🚀 结论

**一个原则**：Tab应该"尽力而为"，而不是"立即放弃"

**两个规则**：
1. 能补全就补全
2. 不能补全才显示选项（且需要双击）

**三个好处**：
1. 符合用户期望
2. 减少操作次数  
3. 保持专注流程