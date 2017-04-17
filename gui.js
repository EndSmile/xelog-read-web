var dbFileElm = document.getElementById('dbfile');


// Execute the commands when the button is clicked
function execEditorContents() {
    execute(editor + ';');
}

// Performance measurement functions
var tictime;
if (!window.performance || !performance.now) {
    window.performance = {now: Date.now}
}
function tic() {
    tictime = performance.now()
}
function toc(msg) {
    var dt = performance.now() - tictime;
    console.log((msg || 'toc') + ": " + dt + "ms");
}
// Load a db from a file
function findAndRenderLog(logFiltrate) {
    tic()
    var logs = find(logFiltrate);
    toc("find")
    renderLog(logs)
}
dbFileElm.onchange = function () {
    var f = dbFileElm.files[0];
    var r = new FileReader();
    r.onload = function () {
        tic()
        openDB(r.result)
        toc("openDB")

        tic()
        var logFiltrate = findAllLogFiltrate();
        toc("findAllLogFiltrate")
        renderFiltrate(logFiltrate)

        findAndRenderLog(logFiltrate);
    }
    r.readAsArrayBuffer(f);
}

$(document).ready(function () {
    var table = $('#example').DataTable();

    $('#logTable tbody').on('click', 'tr', function () {
        alert("click")
    });

});

function zTreeOnCheck(event, treeId, treeNode) {
    console.log(treeNode)
    // alert(treeNode.pId+","+treeNode.tId + ", " + treeNode.name + "," + treeNode.checked);
};

FILTRATE_ID_SEPARATOR = ":"

function getFiltrateText(split) {
    var filtrateText = split[1];
    if (split.length > 2) {
        for (var i = 2; i < split.length; i++) {
            filtrateText += FILTRATE_ID_SEPARATOR + split[i]
        }
    }
    return filtrateText;
}
function renderFiltrate(logFiltrate) {

    var setting = {
        check: {
            enable: true
        },
        callback: {
            onCheck: function (event, treeId, treeNode) {
                console.log(treeNode)
                var id = treeNode.id;
                if (id.indexOf(FILTRATE_ID_SEPARATOR) == -1) {
                    var childTabName = id;
                    var childFiltrate = logFiltrate[childTabName]
                    for (var index in childFiltrate) {
                        childFiltrate[index][TAG_SELECT] = treeNode.checked;
                    }
                    findAndRenderLog(logFiltrate)
                    return
                }

                var split = id.split(FILTRATE_ID_SEPARATOR);
                childTabName = split[0];
                var filtrateText = getFiltrateText(split);
                var childFiltrate = logFiltrate[childTabName];
                if (childTabName == TAG) {
                    for (var index in childFiltrate) {
                        var childFiltrateItem = childFiltrate[index];
                        if (childFiltrateItem[CHILD_TAB_TEXT].indexOf(filtrateText) == 0) {
                            //以filtrateText开头的tag都属于被影响的范围
                            childFiltrateItem[TAG_SELECT] = treeNode.checked
                        }
                    }
                    findAndRenderLog(logFiltrate)
                } else {
                    for (var index in childFiltrate) {
                        var childFiltrateItem = childFiltrate[index];
                        if (childFiltrateItem[CHILD_TAB_TEXT] == filtrateText) {
                            childFiltrateItem[TAG_SELECT] = treeNode.checked
                            findAndRenderLog(logFiltrate)
                            break
                        }
                    }
                }

            }
        },
        data: {
            simpleData: {
                enable: true
            }
        }
    };
    var zNodes = []

    for (var index in childTabList) {
        var childTab = childTabList[index]
        zNodes.push({id: childTab, pId: 0, name: childTab, open: false, checked: true})
        var childFiltrate = logFiltrate[childTab];
        if (childTab == TAG) {
            var tagTree = {}
            for (var childIndex in childFiltrate) {
                //将每一项 "a_b_c"格式的tag拆分成["a","b","c"]的数组
                var tagFiltrateItem = childFiltrate[childIndex];
                var tagArray = tagFiltrateItem.text.split("_");

                //tree的每一项标识
                var tagKey = childTab
                for (var index in tagArray) {
                    var tagItem = tagArray[index]
                    //保存上一次的key值
                    var parentTagKey = tagKey;
                    if (parentTagKey == childTab) {
                        //第一项的tag使用':'隔开
                        tagKey = parentTagKey + FILTRATE_ID_SEPARATOR + tagItem;
                    } else {
                        //["a","b","c"]会分成三项，tagKey"a","a_b","a_b_c"
                        tagKey = parentTagKey + "_" + tagItem;
                    }
                    if (!tagTree[tagKey]) {
                        //如果当前tag未拆入，则插入，并赋值
                        tagTree[tagKey] = tagKey
                        console.log(tagKey)
                        zNodes.push({
                            id: tagKey,
                            pId: parentTagKey,
                            name: tagItem,
                            open: true,
                            checked: tagFiltrateItem[TAG_SELECT]
                        })
                    }
                }

            }
        } else {
            for (var childIndex in childFiltrate) {
                var childFiltrateItem = childFiltrate[childIndex];
                var text = childFiltrateItem.text;
                zNodes.push({
                    id: childTab + FILTRATE_ID_SEPARATOR + text,
                    pId: childTab,
                    name: text,
                    open: true,
                    checked: childFiltrateItem[TAG_SELECT]
                })
            }
        }
    }

    $.fn.zTree.init($("#filtrateTree"), setting, zNodes);
}

var LOG_MODAL_BODY_ARRAY = [TIME, AUTHOR, TAG, LEVEL, THREAD, PACKAGE_NAME, THREAD, REMARKS, EXTRA_1, EXTRA_2, SUMMARY, CONTENT, STACK_TRACE]

function renderLog(logs) {
    for (var index in logs) {
        var log = logs[index]
        var date = new Date(log[TIME]);
        log[TIME] = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
            + " " + (date.getHours() + 1) + ":" + (date.getMinutes() + 1) + ":" + (date.getSeconds() + 1)
            + "." + (date.getMilliseconds() + 1)
    }

    $('#logTable').dataTable({
        ordering: false,
        destroy: true,
        data: logs,
        deferRender: true,
        createdRow: function (row, data, dataIndex) {
            $(row).on('click', function () {
                var body = ""
                for (var index in LOG_MODAL_BODY_ARRAY) {
                    var item = LOG_MODAL_BODY_ARRAY[index];
                    if (data[item] && data[item] != "") {
                        body += "<div>" + item + ":</div> <pre>" + data[item] + "</pre>";
                    }
                }
                $(".modal-body").html(body)
                $('#logModal').modal({})
            })
        },
        columns: [
            {data: ID},
            {data: TIME},
            {data: SUMMARY},
            {data: TAG},
        ]
    });

}
