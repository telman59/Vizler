import os
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Папка с контентом
CONTENT_DIR = "content"
# Выходной XML
OUTPUT_FILE = "menu.xml"
# Файл резервной копии
OLD_FILE = "menu.old"
# Поддерживаемые языки
LANGS = ["EN", "RU", "UZ", "TJ"]

def parse_multilang_file(file_path, is_title=False, folder_name=""):
    """
    Считывает файл с текстом на нескольких языках и возвращает словарь {lang: text}
    Если is_title=True, то ожидаем формат: title | definition
    Возвращает tuple: (titles, definitions) или только content
    """
    if not os.path.exists(file_path):
        if is_title:
            titles = {lang: folder_name for lang in LANGS}
            definitions = {lang: "" for lang in LANGS}
            return titles, definitions
        else:
            return {lang: "" for lang in LANGS}

    titles = {}
    definitions = {}
    content = {}

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or ":" not in line:
                continue
            lang_code, text = line.split(":", 1)
            lang_code = lang_code.strip()
            text = text.strip()
            if lang_code not in LANGS:
                continue
            if is_title:
                if "|" in text:
                    title_text, def_text = text.split("|", 1)
                    titles[lang_code] = title_text.strip()
                    definitions[lang_code] = def_text.strip()
                else:
                    titles[lang_code] = text.strip()
                    definitions[lang_code] = ""
            else:
                content[lang_code] = text.strip()

    if is_title:
        for lang in LANGS:
            if lang not in titles:
                titles[lang] = folder_name
            if lang not in definitions:
                definitions[lang] = ""
        return titles, definitions
    else:
        for lang in LANGS:
            if lang not in content:
                content[lang] = ""
        return content

def build_menu_element(path_relative):
    """Создаёт XML элемент <menu> для текущей папки, рекурсивно добавляя подпапки.

    Контент раздела хранится в отдельных HTML-файлах по языкам:
        content_en.html, content_ru.html, content_uz.html, content_tj.html
    Эти файлы НЕ включаются в menu.xml — они загружаются напрямую из script.js.
    """
    folder_path = os.path.join(CONTENT_DIR, path_relative)
    folder_name = os.path.basename(folder_path)

    title_file = os.path.join(folder_path, "title.txt")

    titles, definitions = parse_multilang_file(title_file, is_title=True, folder_name=folder_name)

    menu_elem = ET.Element("menu", attrib={"name": folder_name})

    # Добавляем title и definition
    for lang in LANGS:
        title_elem = ET.SubElement(menu_elem, "title", attrib={"lang": lang})
        title_elem.text = titles.get(lang, folder_name)
        def_elem = ET.SubElement(menu_elem, "definition", attrib={"lang": lang})
        def_elem.text = definitions.get(lang, "")

    # Рекурсивно проходим подпапки
    for item in sorted(os.listdir(folder_path)):
        item_path = os.path.join(folder_path, item)
        if os.path.isdir(item_path):
            rel_path = os.path.join(path_relative, item)
            submenu_elem = build_menu_element(rel_path)
            menu_elem.append(submenu_elem)

    return menu_elem

def backup_existing_xml():
    """Делает резервную копию menu.xml → menu.old"""
    if os.path.exists(OUTPUT_FILE):
        if os.path.exists(OLD_FILE):
            os.remove(OLD_FILE)
        os.rename(OUTPUT_FILE, OLD_FILE)
        print(f"Старый XML переименован в {OLD_FILE}")

def generate_menu_xml():
    backup_existing_xml()

    root = ET.Element("menus")

    if not os.path.exists(CONTENT_DIR):
        print(f"Папка '{CONTENT_DIR}' не найдена!")
        return

    for section in sorted(os.listdir(CONTENT_DIR)):
        section_path = os.path.join(CONTENT_DIR, section)
        if os.path.isdir(section_path):
            menu_elem = build_menu_element(section)
            root.append(menu_elem)

    # Pretty print XML
    xml_str = ET.tostring(root, encoding='utf-8')
    parsed_xml = minidom.parseString(xml_str)
    pretty_xml_as_str = parsed_xml.toprettyxml(indent="    ")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(pretty_xml_as_str)

    print(f"Новый XML меню создан: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_menu_xml()
