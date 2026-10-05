function setLang(lang){
    language = lang
    loadTitle()
    buildMenu(menuTree)
    if(currentFile){
        // Если открыт файл типа Ponob_TJ.html — меняем язык в имени
        let newFile = currentFile.replace(/_(TJ|UZ|EN|RU)\.html$/i, '_' + lang + '.html')
        window.loadFile(newFile)
        if(currentPath) rebuildBreadcrumbsFromPath(currentPath)
    } else if(currentPath){
        loadContent(currentPath)
        rebuildBreadcrumbsFromPath(currentPath)
    }
}

let language = "EN"
let menuTree
let currentPath = ""
let currentFile = ""

function getLangText(nodes){
    for(let n of nodes){
        if(n.getAttribute("lang") == language)
            return n.textContent
    }
    return nodes[0].textContent
}

function loadTitle(){
    fetch("title.txt")
    .then(r => r.text())
    .then(text => {
        let lines = text.split("\n")
        for(let l of lines){
            if(l.startsWith(language + ":")){
                let parts = l.replace(language + ":", "").split("|")
                let pageTitle = parts[0].trim()
                document.getElementById("page-title").textContent = pageTitle
                document.getElementById("page-description").textContent = parts[1].trim()
                document.title = pageTitle
            }
        }
    })
}

// Загружает content_xx.html для текущего языка и пути
function loadContent(path){
    currentFile = ""
    let lang = language.toLowerCase()
    fetch("content/" + path + "/content_" + lang + ".html")
    .then(r => {
        if(!r.ok) throw new Error("Not found")
        return r.text()
    })
    .then(html => {
        document.getElementById("content-area").innerHTML = html
    })
    .catch(() => {
        document.getElementById("content-area").innerHTML = "<p><i>Контент недоступен.</i></p>"
    })
}

// Загружает любой HTML файл в #content-area
// Используй в ссылках оглавления: onclick="loadFile('content/about/childhood/story1.html')"
// window.loadFile = function(filePath){            // commented 19.07.2026
window.loadFile = function(filePath, menuPath){     // added 19.07.2026
    currentFile = filePath                          
//    currentPath = ""                              // commented 19.07.2026
    currentPath = menuPath || currentPath           // added 19.07.2026
    fetch(filePath)
    .then(r => {
        if(!r.ok) throw new Error("Not found")
        return r.text()
    })
    .then(html => {
        document.getElementById("content-area").innerHTML = html
        // document.getElementById("content-area").scrollIntoView({behavior: "smooth"})
        window.scrollTo({top: 0, behavior: "smooth"})
        if(menuPath) rebuildBreadcrumbsFromPath(menuPath) // added 19.07.2026
    })
    .catch(() => {
        document.getElementById("content-area").innerHTML = "<p><i>Файл недоступен.</i></p>"
    })
}


// Строит хлебные крошки — каждая кликабельна
// При клике: загружает контент этого раздела и обрезает «хвост» крошек
function buildBreadcrumbs(pathArray){
    let container = document.getElementById("breadcrumbs")
    container.innerHTML = ""

    pathArray.forEach((item, index) => {
        let span = document.createElement("span")
        span.textContent = item.title
        span.style.cursor = "pointer"
        span.style.textDecoration = "underline"

        span.onclick = () => {
            // Устанавливаем путь до этой крошки
            currentPath = item.path
            // Загружаем контент
            loadContent(item.path)
            // Обрезаем хвост — оставляем только крошки до index включительно
            buildBreadcrumbs(pathArray.slice(0, index + 1))
        }

        container.appendChild(span)

        if(index < pathArray.length - 1){
            let sep = document.createElement("span")
            sep.textContent = " > "
            sep.style.cursor = "default"
            container.appendChild(sep)
        }
    })
}

function rebuildBreadcrumbsFromPath(path){
    let parts = path.split("/")
    let nodes = []
    let currentLevel = menuTree.documentElement
    let builtPath = ""

    for(let part of parts){
        for(let child of currentLevel.children){
            if(child.getAttribute("name") === part){
                let title = getLangText(child.getElementsByTagName("title"))
                builtPath = builtPath ? builtPath + "/" + part : part
                nodes.push({ title: title, path: builtPath })
                currentLevel = child
                break
            }
        }
    }

    buildBreadcrumbs(nodes)
}

function createMenuNode(node, path){
    let li = document.createElement("li")
    let title = getLangText(node.getElementsByTagName("title"))
    let definition = getLangText(node.getElementsByTagName("definition"))

    // Используем span для текста, чтобы не затереть дочерний ul
    let span = document.createElement("span")
    span.textContent = title
    if(definition) li.title = definition
    li.appendChild(span)

    let folder = node.getAttribute("name")
    let newPath = path ? path + "/" + folder : folder

    let children = node.children
    let submenus = []
    for(let c of children){
        if(c.tagName == "menu")
            submenus.push(c)
    }

    if(submenus.length > 0){
        let ul = document.createElement("ul")
        for(let s of submenus){
            ul.appendChild(createMenuNode(s, newPath))
        }
        li.appendChild(ul)

        li.addEventListener("mouseenter", () => li.classList.add("open"))
        li.addEventListener("mouseleave", () => li.classList.remove("open"))
    }

    li.onclick = (e) => {
        e.stopPropagation()
        currentPath = newPath
        rebuildBreadcrumbsFromPath(newPath)
        loadContent(newPath)
        // Закрываем родительское подменю верхнего уровня
        let parentLi = li.closest("#main-menu > ul > li")
        if(parentLi) parentLi.classList.remove("open")
    }

    return li
}

function buildMenu(xml){
    let root = xml.documentElement
    let ul = document.createElement("ul")
    for(let m of root.children){
        ul.appendChild(createMenuNode(m, ""))
    }
    let nav = document.getElementById("main-menu")
    nav.innerHTML = ""
    nav.appendChild(ul)
}

fetch("menu.xml")
.then(r => r.text())
.then(str => new DOMParser().parseFromString(str, "text/xml"))
.then(xml => {
    menuTree = xml
    buildMenu(xml)
})
loadTitle()
