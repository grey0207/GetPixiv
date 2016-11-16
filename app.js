var request = require('superagent');
var express = require('express');
var cheerio = require("cheerio");
var EventProxy = require('eventproxy');
var async = require("async");
var fs = require("fs");

var app = express();
var ep = new EventProxy();

require('superagent-proxy')(request);
var proxy = 'http://0.0.0.0:8080';//设置代理
var url = 'https://accounts.pixiv.net/login'
var formData = {
  'pixiv_id':'',//用户名
  'password':'',//密码
  'captcha':'',
  'g_recaptcha_response':'',
  'source':'pc'
  }
var headers = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
  "Connection": "Keep-Alive",
  Referer:'http://www.pixiv.net/',
  'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
}
var time = 30000;//超时时间
var limit = 20;//并发连接数

//get postKey and cookie
function getK_C(){
  request
    .get(url)
    .proxy(proxy)
    .query('lang=zh&source=pc&view_type=page&ref=wwwtop_accounts_index')
    .set(headers)
    .end(function (err, res) {
      var postKey = res.text.match(/postKey":"([^"]*)"/)[1];
      var cookie = res.header['set-cookie'].join(',').match(/(PHPSESSID=.+?;)/)[1]
      // console.log('cookie:'+cookie)
      // console.log('key:'+postKey)
      login(postKey,cookie)
  });
}

//login
function login(postKey,cookie){
  request
  .post('https://accounts.pixiv.net/api/login')
  .proxy(proxy)
  .query('lang=zh&source=pc&view_type=page&ref=wwwtop_accounts_index')
  .set(headers)
  .set('Cookie', cookie)
  .type("form")
  .send(formData)
  .send({'post_key':postKey})
  .end(function(err, res){
    var newCookie = res.header['set-cookie'].join(',').match(/(PHPSESSID=.+?;)/)[1]
    get_ranking_area (newCookie)
  });
}

function get_ranking_area (newCookie){
  request
  .get('http://www.pixiv.net/ranking_area.php?type=detail&no=6')//国际排行榜
  .proxy(proxy)
  .set(headers)
  .set('Cookie', newCookie)
  .end(function(err, res){
    var $ = cheerio.load(res.text);
    var li = $('.ranking-item .work_wrapper ._work');
    var list = []
    var title = $('.column-title .self').text()
    var _about = $('._unit ._about').text()
    var folderPath = `${__dirname}/${title}${_about}`

    fs.mkdir(folderPath,function(err){
       if (err) {
           return console.error("目录已经存在");
       }
       console.log(`目录创建成功。`);
    });
    console.log('加载图片列表中...')
    li.each(function(i, elem) {
      var query = $(elem).attr('href')
      var re = /^([0-9a-zA-Z\_\.]+)\?mode=([a-zA-Z]+)\&illust_id=([0-9]+)$/;
      var arr = re.exec(query)
      if($(elem).hasClass('multiple')){
        arr[2]='manga'
      }
      list.push({
        i:i,
        mode:arr[2],
        illust_id:arr[3]
      })
    })

    ep.emit('list',list)
    ep.emit('newCookie',newCookie)
    ep.emit('folderPath',folderPath)
  })  
} 

function fetchUrl(list,newCookie,folderPath){
  request
    .get(`http://www.pixiv.net/member_illust.php`)
    .proxy(proxy)
    .query({mode:list['mode'],illust_id:list['illust_id']})
    .set(headers)
    .set('Cookie', newCookie)
    .end(function(err,res){
      var $ = cheerio.load(res.text);
      var manga_img = []
      var illust_img = $('._illust_modal .original-image').data('src')
      $('.item-container img').each(function(i, elem) {
            manga_img[i] = {id:list['i']+'_'+i,link:$(this).data('src')}
          });
      var images = new function (){
        if(list['mode']==="manga"){
          return manga_img
        }else{
          return [{id:list['i']+1,link:illust_img}]
        }
      }
      // console.log(images)
      ep.emit('images',images)
    });
}




function download (img,time,i,newCookie,folderPath,callback){
  var filePath = `${folderPath}/${i}.jpg`
  var fileName = `${i}.jpg`
  if(fs.existsSync(filePath)){
    console.log(`${fileName}已存在`)
    callback()
  }else{
    if(img === undefined){
      console.log(`${fileName}出现异常跳过`)
      callback()
      return
    }else{
      console.log(`抓取${fileName}链接中`)
      var readStream = request
      .get(img)
      .proxy(proxy)
      .set(headers)
      .set('Cookie', newCookie)
      .timeout(time)
     readStream.on('error', function(err){
        ep.emit('error',filePath)
        return
     });
     readStream.pipe(fs.createWriteStream(filePath))
     .on('close',function(){
         console.log(`${fileName}下载完成！`)
         callback(null)
     })
    }
  }
}

getK_C()//运行

ep.all('list','newCookie','folderPath',function(list,newCookie,folderPath){
  list.forEach(function(list){
    fetchUrl(list,newCookie,folderPath)
  })
  ep.after('images',list.length,function(images){
    var imagesArr = images.reduce(function(a,b){
      return a.concat(b)
    })
    async.mapLimit(imagesArr, limit, function(img, callback) {
      download (img['link'],time,img['id'],newCookie,folderPath,callback)
    }, function (err, result) {
      console.log('done')
    })
  })
})

ep.on('error',function(error){
  fs.unlinkSync(error)
  console.log(error,"超时！")
})

app.listen(3000, function () {
  console.log('app is listening at port 3000');
});



