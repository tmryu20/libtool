var app = new Vue({
   el:'#app',
   methods :{
       getSearchResult:function(e){
           //空白なら何もしない
            if(this.base_query=='') {
                this.message='検索キーワードを入力してください';
                return;
            }
            this.query_expanded=false;
            this.solr_responsed=false;
            this.message='Loading.. クエリ展開APIを呼び出し中...';
           //レゾナントAPI用リクエスト取得
           this.rezo_request = getRezoQuery(this.base_query);
           axios.get(this.rezo_request)
           .then(function(response){
               this.expand_query = response.data.query;
           }.bind(this))
           .finally(function(e){
               this.query_expanded=true;
               this.solr_request = getSolrQuery(this.expand_query,this.rows);               
               this.message='Loading.. Solrに問い合わせ中...';
               axios.get(this.solr_request)
               .then(function(response){
                    //APIの戻り値をオブジェクトに格納
                    this.itemlist = response.data.response.docs;
                    this.numFound = response.data.response.numFound;
                    //キー順にソート
                    this.itemlist.sort( compare );
                    //キーが同じものをグルーピング
                    this.itemlist = makeGroup(this.itemlist);
                    //グループが多い順にソート
                    this.itemlist.sort( compare_memberCount );
               }.bind(this))
               .finally(function(e){
                   this.solr_responsed=true;
               }.bind(this))
           }.bind(this))
       },
       showMember:function(key){
            this.itemlist[key].memberOpen = !this.itemlist[key].memberOpen;
            this.itemlist[key].productname=this.itemlist[key].productname+'*';
       }
   },
   data:{
        rows:500,
        base_query:'' ,
        rezo_request:'',
        expand_query:'',
        query_expanded:false,
        solr_request:'',
        solr_responsed:false,
        numFound:0,
        itemlist:null,
        message:''
    }
})

//キー順にソートする処理
function compare(a,b){
    var r = 0;
    var aa=0;
    var bb=0;

    if(a.group_id!=null) {aa=a.group_id;}
    if(b.group_id!=null) {bb=b.group_id;}
    
    if(aa < bb) {r = -1 ;}
    else { r = 1 }
    return r;
}

//グルーピング数が多い順にソートする処理
function compare_memberCount(a,b){
    var r = 0;
    var aa=0;
    var bb=0;

    if(a.memberCount!=null) {aa=a.memberCount;}
    if(b.memberCount!=null) {bb=b.memberCount;}
    
    if(aa > bb) {r = -1 ;}
    else { r = 1 }
    return r;
}

//同一キーのものをグルーピング
function makeGroup(object){
    var groupedObject=[];

    var prev_group_id='#dummy';
    var memberMaked=false;
    var counter=-1;
    for(var i=0; i<object.length ;i++){
        var tmp = object[i];
        if(tmp.group_id!=null && tmp.group_id == prev_group_id){
            //グループメンバー
            if(memberMaked){
                //メンバーも登録済
                groupedObject[counter].member.push(tmp);
                groupedObject[counter].memberCount ++ ;
            }else{
                //メンバー登録未
                groupedObject[counter].member = [tmp];
                groupedObject[counter].hasMember = true
                groupedObject[counter].memberCount ++ ;
                memberMaked=true;
            }
        }else{
            //新規作成
            tmp.hasMember = false;
            tmp.memberCount = 0;
            tmp.memberOpen=false;
            groupedObject.push(tmp);
            prev_group_id=tmp.group_id;
            memberMaked=false;
            counter++;
        }
    }

    return groupedObject;
}

//レゾAPI（形態素解析）へのリクエスト作成
function getRezoQuery(base_query){
    var prefix="http://kkc.gs3.goo.ne.jp/qg?from=kakaku&q=";
    var url = prefix + encodeURIComponent(base_query);
    return url;
}

//Solrへのリクエスト作成
function getSolrQuery(expand_query,rows){
    var kw=encodeURIComponent(expand_query);
    var prefix='http://d-so-kp0101:8080/solr/kp_q/select?echoParams=none';
    //var prefix='http://t-so-kp0101.kakaku.local:8080/solr/shopping/select?app=ksearch';
    var start=0;
    var wt = 'json';
    var fl = 'group_enum,mallcd,mallcategorycd,mallproductcd,categoryname,productname,prdcomment,prdcomment2,shopid,shopname,jan,price,producturl,imageurl,group_id,kataban'
    var q='{!boost+b%3D$boost_score}{!oneparser}((kp_tri:(' + kw + '))+OR+(kp_sen:(' + kw + ')))';
    //var q='*:*'
    //var boost_q=kw;
    //var sort = 'sortcontrolparam+desc,+score+desc,+rankparam4+desc,+cpcclickcount+desc,+pageview+desc';
    //var boost_score = '{!edismax++v%3D$boost_q+q.op%3D%27OR%27+sow%3Dtrue+qf%3D%27lower_categoryname_sen^10000000.0+category_pankuzu_sen^1000000.0+seriesname_sen^200000.0+makername_sen^100000.0+productname_sen^100.0+productname_tri^1.0+product_sen^100.0+jan^10.0%27}';
    //var fq = '*' + kw + '*';
    //var debugQuery = 'false';
    var url = prefix
        + '&start=' + start 
         + '&wt=' + wt
         + '&fl=' + fl
         + '&q=' + q
    //     + '&boost_q=' + q
    //     + '&sort=' + sort
    //     + '&boost_score=' + boost_score
    //     + '&fq=' + fq
    //     + '&debugQuery=' + debugQuery
         + '&rows=' + rows
    ;
    console.log(url);
    return url;
}

//Solrへのリクエスト作成 ※productnameにだけぶつける簡易版
function getSolrQuery_test(expand_query,rows){
    var kw=encodeURIComponent(expand_query);
    var prefix='http://d-so-kp0101:8080/solr/kp_q/select?echoParams=none';
    //var prefix='http://t-so-kp0101.kakaku.local:8080/solr/shopping/select?app=ksearch';
    var start=0;
    var wt = 'json';
    var fl = 'mallcd,mallcategorycd,mallproductcd,categoryname,productname,prdcomment,prdcomment2,shopid,shopname,jan,price,producturl,imageurl,group_id,kataban'
    //var q='{!boost+b%3D$boost_score}((kp_tri:(' + kw + '))+OR+(kp_sen:(' + kw + ')))^%3D1.0';
    var q='*:*'
    //var boost_q=kw;
    //var sort = 'sortcontrolparam+desc,+score+desc,+rankparam4+desc,+cpcclickcount+desc,+pageview+desc';
    //var boost_score = '{!edismax++v%3D$boost_q+q.op%3D%27OR%27+sow%3Dtrue+qf%3D%27lower_categoryname_sen^10000000.0+category_pankuzu_sen^1000000.0+seriesname_sen^200000.0+makername_sen^100000.0+productname_sen^100.0+productname_tri^1.0+product_sen^100.0+jan^10.0%27}';
    var fq = '*' + kw + '*';
    //var debugQuery = 'false';
    var url = prefix
        + '&start=' + start 
         + '&wt=' + wt
         + '&fl=' + fl
         + '&q=' + q
    //     + '&boost_q=' + q
    //     + '&sort=' + sort
    //     + '&boost_score=' + boost_score
         + '&fq=' + fq
    //     + '&debugQuery=' + debugQuery
         + '&rows=' + rows
    ;
    console.log(url);
    return url;
}


//Solrへのリクエスト作成 Solrリプレース後対応版
function getSolrQueryNew(expand_query,rows){
    var kw=encodeURIComponent(expand_query);
    //var prefix='http://d-so-kp0101:8080/solr/kp_q/select?';
    var prefix='http://t-so-kp0101.kakaku.local:8080/solr/shopping/select?app=ksearch';
    var start=0;
    var wt = 'json';
    var fl = 'mallcd,mallcategorycd,mallproductcd,categoryname,productname,prdcomment,prdcomment2,shopid,shopname,jan,price,producturl,imageurl'
    var q='{!boost+b%3D$boost_score}((kp_tri:(' + kw + '))+OR+(kp_sen:(' + kw + ')))^%3D1.0';
    //var q='*:*'
    var boost_q=kw;
    var sort = 'sortcontrolparam+desc,+score+desc,+rankparam4+desc,+cpcclickcount+desc,+pageview+desc';
    var boost_score = '{!edismax++v%3D$boost_q+q.op%3D%27OR%27+sow%3Dtrue+qf%3D%27lower_categoryname_sen^10000000.0+category_pankuzu_sen^1000000.0+seriesname_sen^200000.0+makername_sen^100000.0+productname_sen^100.0+productname_tri^1.0+product_sen^100.0+jan^10.0%27}';
    var fq = 'datatype:(0+OR+1)';
    var debugQuery = 'false';
    var url = prefix
        + 'start=' + start 
         + '&wt=' + wt
         + '&fl=' + fl
         + '&q=' + q
         + '&boost_q=' + q
         + '&sort=' + sort
         + '&boost_score=' + boost_score
         + '&fq=' + fq
         + '&debugQuery=' + debugQuery
         + '&rows=' + rows
    ;
    return url;
}