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


from PyQt4 import QtGui, QtCore, QtWebKit


def load_page(url):
    web_view.load(QtCore.QUrl(url))  # load existing page


def on_link_clicked(url):
    QtGui.QDesktopServices.openUrl(url)


def on_print_requested():
    printer = QtGui.QPrinter()
    printDialog = QtGui.QPrintPreviewDialog(printer)
    # printDialog.printer()->setPaperSize(QPrinter::A4);
    # printDialog.printer()->setOrientation(QPrinter::Portrait);
    # printDialog.printer()->setPageMargins(10.0,10.0,10.0,10.0,QPrinter::Millimeter);
    # printDialog.printer()->setFullPage(true);
    printDialog.paintRequested.connect(web_view.print)
    printDialog.exec()


def on_context_menu_requested(coord):
    menu = QtGui.QMenu()
#    menu.addAction('Clear', lambda: web_view.setHtml(''))
    menu.addAction('Print', on_print_requested)
    menu.exec_(QtGui.QCursor().pos())



if __name__ == '__main__':
    app = QtGui.QApplication(sys.argv)

    web_view = QtWebKit.QWebView()
    web_view.settings().setAttribute(QtWebKit.QWebSettings.JavascriptEnabled, True)
#    web_view.settings().setAttribute(QtWebKit.QWebSettings.JavascriptCanOpenWindows, True)
    web_view.linkClicked.connect(on_link_clicked)
    web_view.page().setLinkDelegationPolicy(QtWebKit.QWebPage.DelegateAllLinks)
    web_view.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
    web_view.customContextMenuRequested.connect(on_context_menu_requested)

    web_view.show()
    load_page('spreadsheet.html')
    app.exec()
