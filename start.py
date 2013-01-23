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
    def __init__(self, parent, console):
        super().__init__(parent)
        assert isinstance(console, QtGui.QPlainTextEdit)
        self._console = console

    def javaScriptConsoleMessage(self, msg, lineNumber, sourceID):
        msg = "JsConsole(%s:%d): %s" % (sourceID, lineNumber, msg)
        self._console.appendPlainText(msg)
        self._console.ensureCursorVisible()  # scroll to the new message


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
    #    menu.addAction('Clear', lambda: web_view.setHtml(''))
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
        self.web_view = WebView(self, WebPage(self, self.messages))
        self.placeholder.removeWidget(self._placeholder_label)
        self.placeholder.addWidget(self.web_view)

#    @QtCore.pyqtSlot(str)
#    def on_textBrowser_highlighted(self, url):
#        # show link URL in the status bar when cursor is over it
#        self.statusBar().showMessage(url)
#
#    def print_message(self, message, end='\n'):
#        text_browser = self.textBrowser
#        cursor = text_browser.textCursor()
#        cursor.movePosition(QtGui.QTextCursor.End)
#        text_browser.setTextCursor(cursor)
#        if not message.startswith('<>'):
#            message = html.escape(message + end).replace('\n', '<br>')
#        else:
#            if end == '\n':
#                end = '<br>'
#            message += end
#        text_browser.insertHtml(message)
#        text_browser.ensureCursorVisible()  # scroll to the new message
#        QtGui.QApplication.processEvents()


if __name__ == '__main__':
    app = QtGui.QApplication(sys.argv)
    main_window = MainWindow()
    main_window.show()
    main_window.web_view.load(QtCore.QUrl('spreadsheet.html'))  # load existing page
    app.exec()
