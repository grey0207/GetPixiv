// var request = require('superagent');
const axios = require('axios')
const express = require('express');
const request = require('request-promise-native');
const cheerio = require("cheerio");
const async = require("async");
const fs = require("fs");
const qs = require('qs')

const app = express();

const rankUrl = [
  'https://www.pixiv.net/ranking_area.php?type=detail&no=6',//国际排行榜
  'https://www.pixiv.net/ranking.php?mode=daily',//今日排行榜
  'https://www.pixiv.net/ranking.php?mode=male',//受男性欢迎排行榜
  'https://www.pixiv.net/ranking.php?mode=female',//受女性欢迎排行榜
  'https://www.pixiv.net/ranking.php?mode=original',//原创作品排行榜
  'https://www.pixiv.net/ranking.php?mode=daily&content=ugoira',//动图今日排行榜
]



var time = 30000;//超时时间
var limit = 20;//并发连接数

class Request {
  constructor(url) {
    this.options = {
      uri: url,
      transform: function (body) {
          return cheerio.load(body);
      },
      'proxy':'http://10.220.2.48:8080',
      'agent':{keepAlive:true},
      'headers':{
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Connection': 'Keep-Alive',
        'Referer':'http://www.pixiv.net/',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
        'Cookie':'PHPSESSID=208692_0144c84c9bef1448a1967e999ac3e242'
      }
    }
  }
  async req(){
    let $ = await request(this.options)
    const title = $('.column-title .self').text()
    const _about = $('._unit ._about').text()
    const list = []
    $('.ranking-item a.work._work').each((i,el) => list.push([i,$(el).attr('href')]))
    const folderPath = `${__dirname}/${title}${_about}`
    const download_link = []
    const options = this.options
    function get_img(key, value,callback){
      options.uri = `https://www.pixiv.net${value}`
      request(options).then($ => {
        const img_link = $('._illust_modal .original-image').data('src')
        const manga_page_link = $('.works_display .read-more').attr('href')
        const zip_re = /https[0-9a-zA-Z\_\\\/\:\.\-]*1920x1080\.zip/g
        const animation_link = $('#wrapper script').text().match(zip_re)
        if(manga_page_link !== undefined){
          options.uri = `https://www.pixiv.net/${manga_page_link}`
          request(options).then($ => 
            $('.item-container img').each((i,el) => {
              download_link.push([`${key}_${i}`,$(el).data('src')]) 
            })
          )
          
        }else if(img_link !== undefined){
          download_link.push([key,img_link])
        }else{
          download_link.push([key,animation_link[0].replace(/\\/g,'')])
        }
        callback()
      })
    }
    /*async.each(list,function(item,callback){  
        get_img(item[0], item[1],callback)
    },function(err){  
        console.log(download_link);  
    }) */
    let p1 = (key,value) => {
      options.uri = `https://www.pixiv.net${value}`
      request(options).then($ => {
        const img_link = $('._illust_modal .original-image').data('src')
        const manga_page_link = $('.works_display .read-more').attr('href')
        const zip_re = /https[0-9a-zA-Z\_\\\/\:\.\-]*1920x1080\.zip/g
        const animation_link = $('#wrapper script').text().match(zip_re)
        if(manga_page_link !== undefined){
          options.uri = `https://www.pixiv.net/${manga_page_link}`
          request(options).then($ => 
            $('.item-container img').each((i,el) => {
              download_link.push([`${key}_${i}`,$(el).data('src')]) 
            })
          )
          
        }else if(img_link !== undefined){
          download_link.push([key,img_link])
        }else{
          download_link.push([key,animation_link[0].replace(/\\/g,'')])
        }
      })
    }


    for(let [key,value] of list){
      p1(key,value)
    }
    return download_link
  }

    /*dl(){
      this.options.uri = 'https://i.pximg.net/img-zip-ugoira/img/2017/08/02/00/31/15/64174919_ugoira1920x1080.zip'
      request(this.options).pipe(fs.createWriteStream('test.zip'))
    }*/

}

const member_illust_url = new Request(rankUrl[0])
member_illust_url.req().then(x => console.log(x))


app.listen(3000, function () {
  console.log('app is listening at port 3000');
});



