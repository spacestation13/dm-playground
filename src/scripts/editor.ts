import ace from "ace-builds";
//@ts-ignore
import onedark from "ace-builds/src-noconflict/theme-one_dark";

const editor = ace.edit("editor");
editor.setOptions({
  //  editor:
  selectionStyle: "line",
  highlightActiveLine: true,
  highlightSelectedWord: true,
  readOnly: false,
  // copy/cut the full line if selection is empty, defaults to false
  copyWithEmptySelection: true,
  cursorStyle: "smooth",
  mergeUndoDeltas: true,
  behavioursEnabled: true,
  wrapBehavioursEnabled: true,
  // this is needed if editor is inside scrollable page
  autoScrollEditorIntoView: false,
  //keyboardHandler: ???
  showLineNumbers: true,
  relativeLineNumbers: false,
  enableMultiselect: true,
  enableBlockSelect: true,

  //renderer:
  animatedScroll: true,
  showInvisibles: false,
  showPrintMargin: false,
  printMargin: 0,
  showGutter: true,
  fadeFoldWidgets: false,
  showFoldWidgets: true,
  displayIndentGuides: true,
  highlightGutterLine: true,
  hScrollBarAlwaysVisible: false,
  vScrollBarAlwaysVisible: true,
  fontSize: 14,
  //fontFamily
  //maxLines
  //minLines
  //maxPixelHeight
  scrollPastEnd: 0.5,
  fixedWidthGutter: true,
  theme: onedark, //"ace/theme/one_dark",
  //hasCssTransforms
  //useTextareaForIME

  //session:
  wrap: false,
  //wrapMethod: "auto",
  indentedSoftWrap: true,
  firstLineNumber: 1,
  useWorker: true,
  useSoftTabs: true,
  tabSize: 2,
  navigateWithinSoftTabs: false,
  foldStyle: "markbegin",
  overwrite: false,
  newLineMode: "auto",
  //mode
});

export { editor };
