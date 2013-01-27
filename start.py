#!/usr/bin/env python3
__author__ = "Victor Varvariuc <victor.varvariuc@gmail.com>"

import os
import sys


cur_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(cur_dir)


python_required_version = '3.2'  # tested with this version
if sys.version < python_required_version:
    raise SystemExit('Bad Python version', 'Python %s or newer required (you are using %s).'
                     % (python_required_version, sys.version.split(' ')[0]))


from PyQt4 import QtGui, QtCore, QtWebKit, uic


class WebPage(QtWebKit.QWebPage):
    """
    Makes it possible to use a Python logger to print javascript console messages
    """
    def __init__(self, parent, print_message_func):
        super().__init__(parent)
        self.print_message = print_message_func

    def javaScriptConsoleMessage(self, msg, lineNumber, sourceID):
        msg = "JsConsole(%s:%d): %s" % (sourceID, lineNumber, msg)
        self.print_message(msg)


class WebView(QtWebKit.QWebView):

    def __init__(self, parent, web_page):
        super().__init__(parent)
        assert isinstance(web_page, QtWebKit.QWebPage)
        self.setPage(web_page)
        self.settings().setAttribute(QtWebKit.QWebSettings.JavascriptEnabled, True)
#        self.settings().setAttribute(QtWebKit.QWebSettings.JavascriptCanOpenWindows, True)
        self.linkClicked.connect(self.on_link_clicked)
        self.page().setLinkDelegationPolicy(QtWebKit.QWebPage.DelegateAllLinks)
        self.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
        self.customContextMenuRequested.connect(self.on_context_menu_requested)

    def on_link_clicked(self, url):
        QtGui.QDesktopServices.openUrl(url)

    def on_print_requested(self):
        printer = QtGui.QPrinter()
        printDialog = QtGui.QPrintPreviewDialog(printer)
        # printDialog.printer()->setPaperSize(QPrinter::A4);
        # printDialog.printer()->setOrientation(QPrinter::Portrait);
        # printDialog.printer()->setPageMargins(10.0,10.0,10.0,10.0,QPrinter::Millimeter);
        # printDialog.printer()->setFullPage(true);
        printDialog.paintRequested.connect(self.print)
        printDialog.exec()

    def on_context_menu_requested(self, coord):
        menu = QtGui.QMenu()
        menu.addAction('Print', self.on_print_requested)
        menu.exec_(QtGui.QCursor().pos())


FormClass, BaseClass = uic.loadUiType('main_window.ui')
assert BaseClass is QtGui.QMainWindow


class MainWindow(QtGui.QMainWindow, FormClass):

    def __init__(self):
        super().__init__()

        # uic adds a function to our class called setupUi
        # calling this creates all the widgets from the .ui file
        self.setupUi(self)

        # replace placeholder with our widget
        self.web_view = WebView(self, WebPage(self, self.print_to_console))
        self.placeholder_layout.takeAt(0)  # remove placeholder spacer
        # and replace it with our widget
        self.placeholder_layout.addWidget(self.web_view)

        spreadsheet_menu = self.menuBar().addMenu('Spreadsheet')
        addActionsToMenu(spreadsheet_menu, [
            createAction(spreadsheet_menu, 'New', self.spreadsheet_new),
            createAction(spreadsheet_menu, 'Print', self.spreadsheet_print)
        ])

    def print_to_console(self, msg):
        self.messages.appendPlainText(msg)
        self.messages.ensureCursorVisible()  # scroll to the new message

    def spreadsheet_new(self):
        self.print_to_console('New spreadsheet')
        self.web_view.page().mainFrame().evaluateJavaScript("""
if (confirm("Really close without saving changes ?"))
    load(sys.initData);
""")

    def spreadsheet_print(self):
        self.showInformation('Print', 'Print spreadsheet')

    def showWarning(self, title, text):
        """Convenience function to show a warning message box."""
        QtGui.QMessageBox.warning(self, title, text)

    def showInformation(self, title, text):
        """Convenience function to show an information message box."""
        QtGui.QMessageBox.information(self, title, text)

#    @QtCore.pyqtSlot(str)
#    def on_textBrowser_highlighted(self, url):
#        # show link URL in the status bar when cursor is over it
#        self.statusBar().showMessage(url)


def createAction(parent, text, slot=None, shortcut=None, icon=None, tip=None, checkable=False,
                 signal='triggered'):
    """Convenience function to create QActions"""
    action = QtGui.QAction(text, parent)
    if icon:
        action.setIcon(QtGui.QIcon(icon))
    if shortcut:
        action.setShortcut(shortcut)
    if tip:
        action.setToolTip(tip)
        action.setStatusTip(tip)
    if slot:
        getattr(action, signal).connect(slot)
    action.setCheckable(checkable)
    return action


def addActionsToMenu(menu, items):
    """Add multiple actions/menus to a menu"""
    assert hasattr(items, '__iter__'), '`Items` argument must an iterable'
    for item in items:
        if isinstance(item, QtGui.QAction):
            menu.addAction(item)
        elif isinstance(item, QtGui.QMenu):
            menu.addMenu(item)
        else:
            menu.addSeparator()


if __name__ == '__main__':
    app = QtGui.QApplication(sys.argv)
    main_window = MainWindow()
    main_window.show()
    main_window.web_view.load(QtCore.QUrl('spreadsheet2.html'))  # load existing page
    app.exec()
