!macro customInstall
  ; 创建数据库目录
  CreateDirectory "$APPDATA\NovelAssist\data"
  
  ; 创建配置目录
  CreateDirectory "$APPDATA\NovelAssist\config"
  
  ; 写入配置文件，指定数据库和配置路径
  FileOpen $0 "$INSTDIR\app-paths.txt" w
  FileWrite $0 "DATA_PATH=$APPDATA\NovelAssist\data$\r$\n"
  FileWrite $0 "CONFIG_PATH=$APPDATA\NovelAssist\config$\r$\n"
  FileClose $0
!macroend

!macro customUnInstall
  ; 注意：不要删除数据目录，避免用户数据丢失
  ; 如果用户确认要删除数据，可以添加一个选项
  MessageBox MB_YESNO "是否删除所有小说和配置数据？" IDNO SkipDataDeletion
    RMDir /r "$APPDATA\NovelAssist"
  SkipDataDeletion:
!macroend 