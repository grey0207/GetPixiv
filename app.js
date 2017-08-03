// var request = require('superagent');
const axios = require('axios')
const express = require('express');
const request = require('request-promise-native');
const cheerio = require("cheerio");
// const async = require("async");
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
  req(){
    request(this.options)
      .then($ => {
        const title = $('.column-title .self').text()
        const _about = $('._unit ._about').text()
        const list = new Map()
        $('.ranking-item a.work._work').each((i,el) => list.set(i,$(el).attr('href')))
        const folderPath = `${__dirname}/${title}${_about}`
        for(let [key, value] of list){
          this.options.uri = `https://www.pixiv.net${value}`
          request(this.options).then($ => {
            const img_link = $('._illust_modal .original-image').data('src')
            const manga_page_link = $('.works_display .read-more').attr('href')
            const zip_re = /https[0-9a-zA-Z\_\\\/\:\.\-]*1920x1080\.zip/g;
            const animation_link = $('#wrapper script').text().match(zip_re)
            if(manga_page_link !== undefined){
              this.options.uri = `https://www.pixiv.net/${manga_page_link}`
              return request(this.options).then($ => {
                $('.item-container img').each((i,el) => console.log(`${key}_${i}`,$(el).data('src')))
              })
            }else if(img_link !== undefined){
              return console.log(key,img_link);
            }
            console.log(key,animation_link[0]);
          })
        }
      })
      .catch(function (err) {
        console.log(err)
      })}

}

const member_illust_url = new Request(rankUrl[5])
member_illust_url.req()


app.listen(3000, function () {
  console.log('app is listening at port 3000');
});



