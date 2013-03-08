#!/usr/bin/env python3
__author__ = "Victor Varvariuc <victor.varvariuc@gmail.com>"

import sys


python_required_version = '3.2'  # tested with this version
if sys.version < python_required_version:
    raise SystemExit('Bad Python version', 'Python %s or newer required (you are using %s).'
                     % (python_required_version, sys.version.split(' ')[0]))


import os

from PyQt4 import QtGui, QtCore, QtWebKit, uic


QtCore.pyqtRemoveInputHook()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
TEMPLATE_HEADER = 'htmlreporttemplate'


class WebPage(QtWebKit.QWebPage):
    """
    Makes it possible to use a Python logger to print javascript console messages
    """
    def __init__(self, parent, print_message_func=None, url=None):
        super().__init__(parent)
        self.print_message = print_message_func
        if url:
            assert isinstance(url, QtCore.QUrl)
            self.mainFrame().load(url)

    def javaScriptConsoleMessage(self, msg, lineNumber, sourceID):
        if self.print_message:
            msg = "JsConsole(%s:%d): %s" % (sourceID, lineNumber, msg)
            return self.print_message(msg)
        super().javaScriptConsoleMessage(msg, lineNumber, sourceID)


class WebView(QtWebKit.QWebView):

    def __init__(self, parent, web_page):
        super().__init__(parent)
        assert isinstance(web_page, QtWebKit.QWebPage)
        self.setPage(web_page)
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

        template_menu = self.menuBar().addMenu('Template')
        addActionsToMenu(template_menu, [
            createAction(template_menu, 'New', self.template_new, 'Ctrl+N'),
            createAction(template_menu, 'Open', self.template_open, 'Ctrl+O'),
            createAction(template_menu, 'Save', self.template_save, 'Ctrl+S'),
            createAction(template_menu, 'Demo report', self.demo_report, 'Ctrl+D'),
            createAction(template_menu, 'Quit', self.close, 'Ctrl+Q'),
#            createAction(template_menu, 'Print', self.spreadsheet_print)
        ])

    def print_to_console(self, msg):
        self.messages.appendPlainText(msg)
        self.messages.ensureCursorVisible()  # scroll to the new message

    def template_new(self):
        self.print_to_console('New template')
        main_window.web_view.load(QtCore.QUrl('template.html'))  # load existing page
#        self.web_view.page().mainFrame().evaluateJavaScript("""
#if (confirm("Really close without saving changes ?"))
#    load(sys.initData);
#""")

    def template_open(self):
        file_path = QtGui.QFileDialog.getOpenFileName(
            self, 'Load template', BASE_DIR, 'Templates *.htmltt(*.htmltt)'
        )
        if not file_path:
            return
        with open(file_path) as _file:
            first_line = _file.readline()
            if first_line.strip() != TEMPLATE_HEADER:
                return self.showWarning('Bad file format', 'Bad template header')
            table_html = _file.read()
#        main_window.web_view.load(QtCore.QUrl('template.html'))  # load existing page
#        def load():
#            table_element = self.web_view.page().mainFrame().findFirstElement("#table")
#            table_element.setInnerXml(table_html)
#        main_window.web_view.loadFinished.connect(load)
        table_element = self.web_view.page().mainFrame().findFirstElement("#table")
        table_element.setInnerXml(table_html)

    def template_save(self):
        table_element = self.web_view.page().mainFrame().findFirstElement("#table")
#        a = self.web_view.page().mainFrame().evaluateJavaScript('document.getElementById("table").innerHTML')
#        self.print_to_console(table_element.toInnerXml())
        file_path = QtGui.QFileDialog.getSaveFileName(self,
                'Save template', BASE_DIR, 'Templates *.htmltt(*.htmltt)')
        if not file_path:
            return
        with open(file_path, 'w') as _file:
            _file.write(TEMPLATE_HEADER + '\n')
            _file.write(table_element.toInnerXml())
        self.print_to_console('Saved')

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

    def demo_report(self):
        html_report = HtmlReport('demo.htmltt')
        html_report.render_section('shapka')
        for _ in range(20):
            html_report.render_section('stroka')
        html_report.render_section('podval')

        self.web_view.setPage(html_report.to_html())


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


class HtmlReport():

    def __init__(self, template_path):
        with open(template_path) as _file:
            first_line = _file.readline()
            if first_line.strip() != TEMPLATE_HEADER:
                raise Exception('Bad template header')
            table_html = _file.read()

        self.template_web_page = QtWebKit.QWebPage()
        self.template_web_page.mainFrame().load(QtCore.QUrl('template.html'))
        def load(ok):
            main_window.web_view.loadFinished.disconnect(load)
            self.table_element = self.template_web_page.mainFrame().findFirstElement("#table")
            self.table_element.setInnerXml(table_html)
        main_window.web_view.loadFinished.connect(load)

    def render_section(self, section_id, context=None, attach=None):
        """
        @param section_id: str - id of a vertical or horizontal section, can
            contain two ids like "horiz_section_id|verti_section_id"
        @param context: dict  - with variable names and values
        @param attach: bool - whether to attach the section to the right of the
            previously rendered section, instead of rendering the section as
            new row(s). If not given for horizontal sections it's True. For
            vertical and horizontal/vertical sections intersections it's False.
        """
        context = context or {}

    def to_html(self):
        return self.template_web_page
        return QtWebKit.QWebPage()


if __name__ == '__main__':
    app = QtGui.QApplication(sys.argv)
    QtWebKit.QWebSettings.globalSettings().setAttribute(
        QtWebKit.QWebSettings.JavascriptCanOpenWindows, True
    )
    main_window = MainWindow()
    main_window.show()
    main_window.web_view.load(QtCore.QUrl('template.html'))  # load existing page
    app.exec()
