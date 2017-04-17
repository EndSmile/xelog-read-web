/**
 * Created by endsmile on 2017/4/13.
 */

TABLE_NAME_LOG = "log";
CHILD_TAB_TEXT = "text";

ID = "id";
TIME = "time";
PACKAGE_NAME = "package_name";
LEVEL = "level";
THREAD = "thread";
STACK_TRACE = "stack_trace";
AUTHOR = "author";
REMARKS = "remarks";
SUMMARY = "summary";
TAG = "tag";
TAG_SELECT = "tag_select";
CONTENT = "content";
EXTRA_1 = "extra1";
EXTRA_2 = "extra2";

var childTabList=[TAG,PACKAGE_NAME,LEVEL,THREAD,STACK_TRACE,AUTHOR,EXTRA_1,EXTRA_2,REMARKS,SUMMARY]

var db;

function openDB(result) {
    db = new SQL.Database(new Uint8Array(result))
    db.exec("select * from log")
}

var childTabMapByFind;

function findAllLogFiltrate() {
    childTabMapByFind = {}

    var logFiltrate={}
    console.log(childTabList)

    for(var index in childTabList){
        var childTab = childTabList[index]
        logFiltrate[childTab]=findChildTab(childTab)
    }
    console.log("findLogFiltrate")
    console.log(logFiltrate)
    return childTabMapByFind
}

function findChildTab(childTabName) {
    var tabContentArray = [];

    var sql = "select * from "+childTabName;
    var res = db.exec(sql);
    var values = res[0].values;
    for (var id in values){
        var value = values[id];
        var tab = {
            id:value[0],
            text:value[1]
        }
        if(childTabName==TAG){
            tab[TAG_SELECT] = value[2]!=0
        }else {
            tab[TAG_SELECT] = true
        }
        tabContentArray[value[0]] = tab

    }
    childTabMapByFind[childTabName] = tabContentArray
    return tabContentArray
}

function find(logFiltrate) {
    var logs=[]

    //有效性校验，如果有一项筛选全部为false，则返回结果直接为空
    for (var index in logFiltrate){
        var valid = false
        var childFiltrate = logFiltrate[index]
        for (var rowIndex in childFiltrate){
            var rowItem = childFiltrate[rowIndex]
            if (rowItem[TAG_SELECT]){
                valid = true
                break
            }
        }
        if (!valid){
            return []
        }
    }

    var sql = "select * from "+TABLE_NAME_LOG+" where ";
    for (var index in childTabList){
        var childTabName = childTabList[index];
        var childFiltrate = logFiltrate[childTabName]

        sql = buildFiltrateSql(childTabName,sql,childFiltrate)
    }
    //去掉最后的' and '
    sql = sql.substring(0,sql.length-5)
    sql += " order by "+ID+" desc "
    console.log(sql)

    var res = db.exec(sql)[0];

    var columns = res.columns;
    var values = res.values;
    //取出log数据库的数据
    for (var rowIndex in values){
        var value = values[rowIndex];
        var row = {}
        for (var columnIndex in columns){
            var columnName = columns[columnIndex];
            row[columnName] = value[columnIndex]
        }

        //连接子表数据
        for(var index in childTabList){
            var childTabName = childTabList[index]
            var realItem = childTabMapByFind[childTabName][row[childTabName]];
            if (realItem){
                row[childTabName] = realItem.text
            }else {
                row[childTabName] = ""
            }
        }
        logs.push(row)
    }
    console.log("findLogs")
    console.log(logs)
    return logs
}

function buildFiltrateSql(childTabName,sql,childFiltrate) {
    sql += childTabName
    sql += " in ("
    console.log(childFiltrate)
    for (var index in childFiltrate){
        var item = childFiltrate[index];
        if (item[TAG_SELECT]){
            sql+=item[ID]
            sql+=","
        }
    }
    sql = sql.substring(0,sql.length-1)
    sql += ") and "
    return sql
}