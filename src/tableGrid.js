/*
 * tableGrid
 * https://github.com/Ysudo/tableGrid
 *
 * Copyright (c) 2012 Yun Sudong
 * Licensed under the MIT license.
 */

(function( $, undefined ) {

$.widget( "ui.tableGrid", {
    options: {
        mode : "Table",                 // 显示类型：Table or Template
        template : "",                  // 模板ID
        tplhandle : null,               // 模板数据预处理
        mtype: "post",                  // 请求类型：get or post
        colModel: [],                   // 列设置
                                        // {
                                        //      name:"标题一",                 || 列标题
                                        //      align:"center",                || 内容对齐方式
                                        //      order:"desc",                  || 排序：normal & desc or asc
                                        //      data:"s1",                     || 数据列
                                        //      width:"200px",                 || 列宽度
                                        //      handle: function(str){         || 预处理数据
                                        //          //do something..
                                        //          return str;
                                        //      }
                                        // }
        showHead: true,                 // 是否显示表头
        url: "",                        // 请求数据URL
        urlData: {},                    // 请求时参数
        height: "auto",                 // 表格高度
        width: "auto",                  // 表格宽度
        viewWidth: "auto",                // 可视宽度
        scrolling: false,               // 是否滚动加载
        button: [],                     // 插入按钮
                                        // {
                                        //   text: "刷新",                     || 按钮文字
                                        //   icons: {                          || 按钮图标样式 link:http://alibaba-049382.hz.ali.com/demo/AliFinanceBaseLibrary/docs/index.html#uicss|default
                                        //     primary: "ui-icon-refresh"
                                        //   },
                                        //   onclick: function(){              || 按钮事件
                                        //     //do something..
                                        //   }
                                        // }
        showpage: true,                 // 是否显示翻页
        isCheckbox: null,               // 是否可选：radio & multiple or null
        showViewNum: true,              // 可否显示设置每页条数
        rowNum: 10,                     // 设置每页条数
        rowList: "10,20,30",            // 设置每页条数选项值 TODO:更换为字符串形式。
        nowPage: 1,                     // 设置当前页
        altRows: true,                  // 是否设置隔行变色
        ajaxSetup: { },                 // AJAX请求设置，详见jQuery link:http://api.jquery.com/jQuery.ajax/?fuckgfw
        success : null,                 // 请求成功回调
        failure : null                  // 请求失败回调
    },

    _itemOldWidth : [],

    _alltWidth : 0,

    _thisData : null,

    _oldWidth : 0,

    _isLoading : false,

    _create: function() {
        //console.log("creat:" + new Date().getTime())
        if ( !this.options.url ) { return };
        this.element
            .addClass( "ui-tbgrid ui-widget ui-widget-content ui-corner-all" )

        $( "<div class='ui-tbgrid-viewwidth' ><div class='ui-widget-header ui-tbgrid-hd'></div><div class='ui-tbgrid-main'></div></div><div class='ui-widget-header ui-tbgrid-button-col'></div><div class='ui-widget-header ui-tbgrid-foot'></div>" ).appendTo( this.element );


        this._initSetWidth()

        var el = $('<div></div>').addClass('ui-widget-overlay ui-helper-hidden')
            .appendTo(this.element)
        if ($.fn.bgiframe) {
            el.bgiframe();
        }
        this.options.scrolling && $('<div class="ui-tbgrid-loading"></div>').appendTo(this.element.find( ".ui-tbgrid-main" ));

        this._oldWidth = this.element.width();

        this._createHead();
        this._getData(function(){
            this._createMain();
            this._createFoot();
            this._createButton();
            this.options.success && this.options.success(this,this._thisData);
            $(window).resize($.proxy(this._refreshWidth,this))
        });

    },

    _createHead: function(){
        var head = this.element.find( ".ui-tbgrid-hd" );
        head.empty();
        var num = this.options.colModel.length;
        var _this = this;
        this._itemOldWidth = [];
        if ( this.options.isCheckbox == "radio" ) {
             $('<div class="ui-tbgrid-hd-checkbox"><span>选择</span></div>').appendTo( head );
        } else if ( this.options.isCheckbox == "multiple" ) {
            $('<div class="ui-tbgrid-hd-checkbox"><span>全选</span></div>')
            .toggle(function(){
                $(this).html("<span>取消</span>");
                _this.element.find('.ui-tbgrid-main > .ui-tbgrid-tr').addClass('selected')
            },function(){
                $(this).html("<span>全选</span>");
                _this.element.find('.ui-tbgrid-main > .ui-tbgrid-tr').removeClass('selected')
            })
            .appendTo( head );
        };
        for (var i = 0 ; i < num; i++) {
            var config = $.extend( {align:"left" , order:"" , width:"auto"} , this.options.colModel[i] )
            var tmp = [];
            tmp.push('<div class="ui-tbgrid-th ui-tbgrid-title_' + config.data + '" style="text-align:' + config.align +'; width:' + config.width + '">');
            if ( config.order ) {
                tmp.push('<span data-sort="normal" data-name="' + config.data + '" class="ui-tbgrid-order normal" title="按此字段排序">' + config.name + '</span>')
                _this.options.urlData.orderName = config.data;
                _this.options.urlData.orderSort = config.order;
            } else {
                tmp.push('<span>' + config.name + '</span>' );
            } 
            tmp.push('</div>')
            var title = $( tmp.join("") ).appendTo( head );
            this._alltWidth += title.width();
            //this._itemWidth.push(title.width())
            this._itemOldWidth.push(title.width())
        };
        head.find('.ui-tbgrid-title_' + this.options.urlData.orderName + ' > span')
            .attr( "class" , "ui-tbgrid-order " + this.options.urlData.orderSort )
            .attr( "data-sort" , this.options.urlData.orderSort );
        head.find('div').last().addClass('ui-tbgrid-th-last');
        !this.options.showHead && head.hide();
        this._setWidth();
        this._setOrder();
    },

    _createFoot:function(){
        var foot = this.element.find( ".ui-tbgrid-foot" );
        foot.empty();
        if ( this.options.scrolling ) {
            foot.hide()
        } else if ( this.options.showpage ) {
            this._createPager()
        } else {
            foot.hide()
        };
    },

    _createButton:function(){
        var button = this.element.find( ".ui-tbgrid-button-col" );
        button.empty();
        if ( this.options.button.length > 0 ) {
            var btnCol = $('<div class="ui-tbgrid-button"></div>');
            $.each( this.options.button , function( i , v ){
                var btn = $('<button>').html(v.text);
                btn.button( { icons: v.icons } )
                btn.click( v.onclick )
                btn.appendTo( btnCol )
            })
            btnCol.prependTo(button)
        };
    },

    _createMain: function(){
        var main = this.element.find( ".ui-tbgrid-main" );
        !this.options.scrolling && main.empty();
        var num = this.options.colModel.length;
        var datanum = this._thisData.rows.length;
        if ( datanum == 0  ) {
            $('<div class="ui-state-highlight ui-corner-all" style="width: ' + ( this.options.viewWidth - 20 ) + 'px" > <p><span class="ui-icon ui-icon-info"></span><strong>暂无数据！</strong> 请修改查询条件重试</p></div>').appendTo( main )
        } else {
            switch (this.options.mode) {
                case "Table" :
                    
                    for (var i = 0 ; i < datanum; i++) {
                        var tmp = [];
                        tmp.push('<div class="ui-tbgrid-tr">');
                        if ( this.options.isCheckbox  ) {
                            tmp.push('<div class="ui-tbgrid-checkbox"><span class="ui-tbgrid-item-' + this.options.isCheckbox + '"></span></div>')
                        }
                        for (var n = 0; n < num; n++) {
                            var config = $.extend( {align:"left" , order:"" , width:"auto" , handle : null} , this.options.colModel[n] )
                            tmp.push('<div class="ui-tbgrid-td" style="text-align:' + config.align +'; width:' + config.width + 'px">');
                            var text = config.handle ? config.handle(this._thisData.rows[i][config.data] , this._thisData.rows[i] ) : this._thisData.rows[i][config.data];
                            tmp.push('<div class="ui-tbgrid-text ui-tbgrid-text-' + config.data + '">' + text + '</div>');
                            tmp.push('</div>')
                        };
                        tmp.push('</div>')
                        if ( this.options.scrolling ) {
                            var title = $( tmp.join("") ).insertBefore( this.element.find( ".ui-tbgrid-loading" ) );
                        } else {
                            var title = $( tmp.join("") ).appendTo( main );
                        }
                        title.data("data-all",this._thisData.rows[i])
                        title.find('.ui-tbgrid-td').last().addClass('ui-tbgrid-td-last');
                    };
                    break
                case "Template" :
                    var datanum = this._thisData.rows.length;
                    for (var i = 0 ; i < datanum; i++) {
                        var data = this.options.tplhandle ? this.options.tplhandle(this._thisData.rows[i]) : this._thisData.rows[i];
                        var tmp = $('<div class="ui-tbgrid-tr"></div>').html(template( this.options.template,data ));
                        tmp.appendTo(main);
                    }
                    break
                default:
                    throw "options mode error"
            }

            this.options.scrolling && this._setScrolling();
            this._setAltRows()
            this._refreshWidth();
        }
        this._isLoading = false;
        this.element.find(".ui-widget-overlay").fadeOut();
    },

    _createPager: function(){
        var foot = this.element.find( ".ui-tbgrid-foot" );
        var pageCount = this._thisData.total/this.options.rowNum;
        var page = this.options.nowPage;
        var _this = this;
        page = this._checkPage(page,pageCount)
        this.options.nowPage = page;
        pageCount = Math.ceil(pageCount);
        var strHtml = "",prevPage = page - 1, nextPage = page + 1;
        if (!!this.options.showViewNum){
                strHtml += '<div class="ui-tbgrid-sizer"><span class="ui-tbgrid-explain">每页显示数量</span>';
                var rowText = $.isArray(this.options.rowList) ? this.options.rowList : this.options.rowList.split(",");
                jQuery.each(rowText,function(i){
                    var active = rowText[i] == _this.options.rowNum ? "active" : "";
                    strHtml += '<a href="#" data:view="'+rowText[i]+'" class="ui-page-view ' + active + '">'+rowText[i]+'</a>'
                })
                strHtml += '</div>';
        }
        strHtml += '<div class="ui-tbgrid-pager"><span class="ui-tbgrid-explain">共'+this._thisData.total+'条记录</span>';
        if (prevPage < 1) {
            strHtml += '<a href="#" title="已是最前一页" data:page="0" class="page-prev page-prev-disabled">已是最前一页</a>';
        } else {
            strHtml += '<a href="#" title="上一页" data:page="' + prevPage + '" class="page-prev">上一页</a>';
        }
        if (page == 1) {
                strHtml += '<a href="#" title="第 1 页" data:page="1" class="ui-page-num active"><span>1</span></a>';
            } else {
                strHtml += '<a href="#" title="第 1 页" data:page="1" class="ui-page-num"><span>1</span></a>';
            }
            
        if (page > 3) {
            var startPage = page - 3;
        } else{
            var startPage = 1;
        }
        if (startPage > (pageCount - 6) && (pageCount - 6) > 0 ){
            var startPage = (pageCount - 6);
        }
        if (startPage > 1) strHtml += '<span class="page-break">...</span>';
        for (var i = startPage + 1; i < startPage + 6; i++) {
            if (i >= pageCount) break;
            if (i == page) {
                strHtml += '<a href="#" title="第 ' + i + ' 页" data:page="' + i + '" class="ui-page-num active"><span>' + i + '</span></a>';
            } else {
                strHtml += '<a href="#" title="第 ' + i + ' 页" data:page="' + i + '" class="ui-page-num"><span>' + i + '</span></a>';
            }
        }
        if (pageCount > startPage + 6) strHtml += '<span class="page-break">...</span>';
        if (pageCount > 1){
            if (page == pageCount) {
                strHtml += '<a href="#" title="第 '+ pageCount + ' 页" data:page="'+ pageCount + '" class="ui-page-num active"><span> '+ pageCount + ' </span></a>';
            } else {
                strHtml += '<a href="#" title="第 '+ pageCount + ' 页" data:page="'+ pageCount + '" class="ui-page-num"><span> '+ pageCount + ' </span></a>';
            }
        }
        if (nextPage > pageCount ) {
            strHtml += '<a href="#" title="已是最后一页" data:page="'+ pageCount +'" class="page-next page-next-disabled">已是最后一页</a>';
        } else {
            strHtml += '<a href="#" title="下一页" data:page="' + nextPage + '" class="page-next">下一页</a>';
        }
        strHtml += '<span class="explain">到第</span> <input type="text" class="ui-tbgrid-jump-page" maxlength="4"/> <span class="explain">页</span><a href="#" class="ui-tbgrid-jump-btn" ><span>确定</span></a>';
        strHtml += "</div>";
        $(strHtml).appendTo(foot)
        foot.find("a.ui-page-num , a.ui-page-view , a.ui-tbgrid-jump-btn").button({
            create: function(event, ui) {
                $(this).hasClass("active") && $(this).button( "disable" )
            }
        })
        foot.find("a.page-prev").button({
            text: false,
            icons: {
                primary: "ui-icon-seek-prev"
            },
            create: function(event, ui) {
                $(this).hasClass("page-prev-disabled") && $(this).button( "disable" )
            }
        })
        foot.find("a.page-next").button({
            text: false,
            icons: {
                primary: "ui-icon-seek-next"
            },
            create: function(event, ui) {
                $(this).hasClass("page-next-disabled") && $(this).button( "disable" )
            }
        })
        foot.find("a.ui-page-num , a.page-prev , a.page-next").click(function(event){
            event.preventDefault();
            $(this).button( "disable" )
            _this.options.nowPage = _this._checkPage($(this).attr("data:page"),pageCount);
            _this._getData(function(){
                _this._createMain();
                _this._createFoot();
                _this.options.success && _this.options.success(_this,this._thisData);
            });
        })
        foot.find("a.ui-page-view").click(function(event){
            event.preventDefault();
            $(this).button( "disable" );
            _this.options.nowPage = 1;
            _this.options.rowNum = $(this).attr("data:view");
            _this._getData(function(){
                _this._createMain();
                _this._createFoot();
                _this.options.success && _this.options.success(_this,this._thisData);
            });
        })
        foot.find("a.ui-tbgrid-jump-btn").click(function(event){
            event.preventDefault();
            var val = foot.find(".ui-tbgrid-jump-page");
            if ( val.val() == "" || isNaN(parseInt(val.val())) ) { 
                val.val("")
                return 
            };
            $(this).button( "disable" );
            _this.options.nowPage = _this._checkPage(val.val(),pageCount);
            _this._getData(function(){
                _this._createMain();
                _this._createFoot();
                _this.options.success && _this.options.success(_this,this._thisData);
            });
        })
        foot.find("input.ui-tbgrid-jump-page").keypress(function(event){
            if(event.keyCode==13) {
                var val = $(this);
                if ( val.val() == "" || isNaN(parseInt(val.val())) ) { 
                    val.val("")
                    return 
                };
                _this.options.nowPage = _this._checkPage(val.val(),pageCount);
                _this._getData(function(){
                    _this._createMain();
                    _this._createFoot();
                    _this.options.success && _this.options.success(_this,this._thisData);
                });
            }
        })
        
    },

    _checkPage: function(page,count){
        if (isNaN(parseInt(page))) page = 1;
        if (page < 1) page = 1;
        if (page > count) page = count;
        page = Math.ceil(page);
        return page
    },

    _getData: function(callback){
        !this.options.scrolling && this.element.find(".ui-widget-overlay").show();
        var _this = this;
        var option = {};
        option.url = this.options.url;
        option.type = this.options.mtype;
        if ( this.options.showpage ){
            option.data = $.extend({rowNum:this.options.rowNum,page:this.options.nowPage} , this.options.urlData);
        } else {
            option.data = this.options.urlData;
        }
        option.dataType = "json";
        option.success = function(json){
            if ( !json ) {
                option.error();
                return
            }
            _this._thisData =  json;
            callback && callback.apply(_this)
        };
        option.error = function(XMLHttpRequest){
            _this.element.find(".ui-widget-overlay").fadeOut();
            var main = _this.element.find( ".ui-tbgrid-main" );
            main.empty();
            if ( XMLHttpRequest && 403 != XMLHttpRequest.status) {
                $('<div class="ui-state-error ui-corner-all" style="width: ' + ( _this.options.viewWidth - 20 ) + 'px"> <p><span class="ui-icon ui-icon-alert"></span> <strong>错误:</strong> 您没有权限进行此操作！ </p></div>').appendTo( main )
            } else {
                $('<div class="ui-state-error ui-corner-all" style="width: ' + ( _this.options.viewWidth - 20 ) + 'px"> <p><span class="ui-icon ui-icon-alert"></span> <strong>错误:</strong> 请求失败，请重试 </p></div>').appendTo( main )
            }
            _this.option.failure && _this.options.failure(this,XMLHttpRequest)
            throw "url error"
        }
        option.complete = function(XMLHttpRequest, textStatus){
            
        }
        $.ajax( $.extend( option , this.options.ajaxSetup ) )
    },

    _setOrder: function(){
        var _this = this;
        var orderbtn = this.element.find(".ui-tbgrid-order");
        orderbtn.click(function(){
            var rule = $( this ).attr( "data-sort" );
            if ( rule == "normal" ) {
                _this.options.urlData.orderName = $( this ).attr( "data-name" );
                _this.options.urlData.orderSort = "desc";
                orderbtn.attr( "class" , "ui-tbgrid-order normal" )
                .attr( "data-sort" , "normal" );
                $( this ).removeClass( "normal" ).addClass( "desc" );
                $( this ).attr( "data-sort" , "desc" );
            } else if ( rule == "desc" ) {
                _this.options.urlData.orderName = $( this ).attr( "data-name" );
                _this.options.urlData.orderSort = "asc";
                orderbtn.attr( "class" , "ui-tbgrid-order normal" )
                .attr( "data-sort" , "normal" );
                $( this ).removeClass( "normal" ).addClass( "asc" );
                $( this ).attr( "data-sort" , "asc" );
            }else if ( rule == "asc" ) {
                _this.options.urlData.orderName = $( this ).attr( "data-name" );
                _this.options.urlData.orderSort = "normal";
                orderbtn.attr( "class" , "ui-tbgrid-order normal" )
                .attr( "data-sort" , "normal" );
            };
            _this.refresh()
        })
    },

    _setWidth: function(allw){

        var allw = allw
        
        if ( this.options.width != "auto" ) { allw = this.options.width };
        if ( !allw || allw == "auto") {
            allw = parseInt(this.element.width(),10);
        }
        if ( this.options.isCheckbox ) { allw = allw - 50 };
        //console.log(this.options.viewWidth)
        var pw = parseInt(((allw - this._alltWidth - this.options.colModel.length - 20 ) / this.options.colModel.length ), 10) ;
        var itemlen = this._itemOldWidth.length;
        var oldWidth = this._itemOldWidth;
        this.element.find('.ui-tbgrid-tr').each(function(j,v){
            var height = [];
            for (var i = 0 , len = itemlen; i < len; i++) {
                var td = $(v).find('.ui-tbgrid-td').eq(i);
                td.width(oldWidth[i] + pw);
                height.push(td.height())
            };
            $(v).find('.ui-tbgrid-td , .ui-tbgrid-checkbox').height(height.sort(function(a,b){return a>b?1:-1}).pop())
        })
        for (var i = 0 , len = itemlen; i < len; i++) {
            //this._itemWidth[i] += pw;
            this.element.find('.ui-tbgrid-hd div:not(.ui-tbgrid-hd-checkbox)').eq(i).width(oldWidth[i] + pw)
        };
    },

    _setScrolling: function(){
        var main = this.element.find( ".ui-tbgrid-main" );
        //$('<div class="ui-tbgrid-loading"></div>').appendTo(main);
        main.scroll($.proxy( function(){
            if ( (main.height() + main.scrollTop() + 36 > main.get(0).scrollHeight) && !this._isLoading ) {
                this.options.nowPage += 1;
                this._isLoading = true;
                this._getData(function(){
                    this._createMain()      
                });
                //console.log(this._isLoading )
            }
        },this))
    },

    _setAltRows: function(){
        var item = this.element.find(".ui-tbgrid-main > .ui-tbgrid-tr");
        if ( this.options.altRows ){
            this.element.find(".ui-tbgrid-main > .ui-tbgrid-tr:nth-child(even)").addClass("odd");
            item.unbind("hover").hover( function(){
                    $(this).addClass( "over" );
                },
                function(){
                    $(this).removeClass( "over" );
                }
            )
        }
        var _this = this;
        item.unbind("click").bind('click', function() {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                !(_this.options.isCheckbox == "multiple") && $(this).siblings('.ui-tbgrid-tr.selected').removeClass('selected');
                $(this).addClass('selected');
            }
            //console.log(_this.element.find(".ui-tbgrid-main > .ui-tbgrid-tr.selected").size())
        });
    },

    _refreshWidth: function() {
        this._initSetWidth()
        this._setWidth(this.element.width())
    },

    _initSetWidth: function(){
        //if ( this.options.viewWidth == null ){ this.options.viewWidth = this.options.width }
        //if ( this.options.width == "auto" ){ this.options.width = this.element.width() }
        //if ( this.options.viewWidth == "auto" ){ this.options.viewWidth = this.element.width() }
        if ( ( this.options.viewWidth == "auto" && this.element.width() > this.options.width ) || ( this.options.viewWidth != "auto" && this.options.viewWidth > this.options.width ) ){ 
            this.options.width = "auto" 
        }
        this.element.css({
            //width: this.options.viewWidth
        })
        this.element.find(".ui-tbgrid-hd").css({
            width: this.options.width
        })
        var mainHeight = this.options.height;
        if ( this.options.scrolling && this.options.height == "auto" ) {
            mainHeight = this.options.rowNum * 18
        }
        this.element.find(".ui-tbgrid-main").css({
           height: mainHeight,
           width: this.options.width
        })
        this.element.find(".ui-tbgrid-viewwidth").css({
            width: this.options.viewWidth
        })
        if ( !!($.browser.msie && $.browser.version < 8) ){
            this.element.find(".ui-tbgrid-viewwidth").css({
                height: mainHeight + 50
            })
        }
    },

    refresh: function(){
        if ( this.options.scrolling ){ return };
        this._getData(function(){
            this._createMain();
            this.options.success && this.options.success(this,this._thisData);
        });
    },

    query: function(data){
        this.options.urlData = data;
        this.options.nowPage = 1;
        this._getData(function(){
            this._createMain();
            this._createFoot();
            this._createButton();
            this.options.success && this.options.success(this,this._thisData);
        });
    },

    getSelected: function(){
        var tmp = [];
        $.each( $(this.element.find(".ui-tbgrid-tr.selected")) , function(i,v){
            tmp.push($(v).data("data-all"))
        })
        return tmp
    }

});

$.extend( $.ui.tableGrid, {
    version: "1.1.0"
});

})( jQuery );