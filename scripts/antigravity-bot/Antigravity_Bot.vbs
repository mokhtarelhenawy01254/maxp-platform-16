' Antigravity Telegram Bot Background Service Runner
Option Explicit
Dim sh
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "H:\maxp-platform\scripts\antigravity-bot"
sh.Run """C:\Users\mokhtar\AppData\Local\Programs\nodejs\node.exe"" ""H:\maxp-platform\scripts\antigravity-bot\bot.js""", 0, False
