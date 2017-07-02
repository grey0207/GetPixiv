// var request = require('superagent');
const axios = require('axios')
const express = require('express');
const cheerio = require("cheerio");
// const async = require("async");
const fs = require("fs");
const qs = require('qs')

const app = express();

//设置代理
//axios.defaults.proxy ={
//   host: '127.0.0.1',
//   port: 1080
// }
const url = 'https://www.pixiv.net/ranking_area.php?type=detail&no=6'//抓取的链接

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
(async () => {
  let loginCookie = fs.existsSync(`cookie.txt`) ? fs.readFileSync(`cookie.txt`) : ''
  const headers_2 = Object.assign({},headers,{Cookie:loginCookie.toString()})
  console.log(headers_2);
  const fetchUrl = axios.create({
    method: 'get',
    headers:headers_2,
  });
  const getHomePage = await fetchUrl('https://www.pixiv.net/').then(res => {
    const $ = cheerio.load(res.data)
    const username = $('.user-name-container a').text()
    if (username==='') {
      console.log('未登录')
      // getLoginCookie()
    }else{console.log('已登录')}
  })
  const get_ranking_area = await fetchUrl(url)
  let $ = cheerio.load(get_ranking_area.data)
  const title = $('.column-title .self').text()
  const _about = $('._unit ._about').text()
  const list = new Map()
  $('.ranking-item .work._work').each((i,el) => list.set(i,$(el).attr('href')))
  const folderPath = `${__dirname}/${title}${_about}`
  if(fs.existsSync(folderPath)){
    console.error("目录已经存在")
  }else{
    fs.mkdirSync(folderPath)
    console.log(`目录创建成功`)
  }
  // for(let [key, value] of list){
  //   fetchUrl(`https://www.pixiv.net${value}`).then(res => {
  //     let $ = cheerio.load(res.data)
  //     const illust_img = $('._illust_modal .original-image').data('src')
  //   })
  // }
  // download(fetchUrl,'https://i.pximg.net/img-original/img/2017/06/26/00/01/02/63567947_p0.jpg',folderPath,0)

})()

const getLoginCookie = async () => {
  const getData = await axios.get('https://accounts.pixiv.net/login')
  const postKey = await getData.data.match(/postKey":"([^"]*)"/)[1]
  const cookie = await getData.headers['set-cookie'].join(',').match(/(PHPSESSID=.+?;)/)[1]
  const formData = {
    'pixiv_id':'zhb',//用户名
    'password':'50904090',//密码
    'captcha':'',
    'g_recaptcha_response':'',
    'source':'pc',
    'post_key':postKey
  }
  const headers_1 = Object.assign({},headers,{Cookie:cookie})
  const login = await axios.post('https://accounts.pixiv.net/api/login',qs.stringify(formData),{headers:headers_1})
  console.log('获取登录cookie')
  const loginCookie = await login.headers['set-cookie'].join(',').match(/(PHPSESSID=.+?;)/)[1]
  if (fs.existsSync(`cookie.txt`)) {
    fs.unlinkSync('cookie.txt')
  }
  fs.writeFileSync('cookie.txt',loginCookie)
}

const download = async (fetchUrl,imgUrl,folderPath,i) => {
  const filePath = `${folderPath}/${i}.jpg`
  const fileName = `${i}.jpg`
  if(fs.existsSync(filePath)){
    console.log(`${fileName}已存在`)
    return
  }else if(imgUrl === undefined){
    console.log(`${fileName}没有获取到链接`)
    return
  }else{
    console.log(`抓取${fileName}链接中`)
    const readStream = await fetchUrl(imgUrl,{responseType:'stream'})
    readStream.data.pipe(fs.createWriteStream(filePath)).on('close',() => {
      console.log(`${fileName}下载完成！`)
    })
  }
}
/*
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

// getK_C()//运行

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
})*/

app.listen(3000, function () {
  console.log('app is listening at port 3000');
});



