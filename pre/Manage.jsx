var React = require('react');
var Helmet = require('react-helmet');
var AppBrief = require('./AppBrief.jsx');
module.exports = React.createClass({
  displayName: "Manage",
  getInitialState: function(){
    var type=(this.props.location.pathname.match(/\/manage\/(\w*)/)||[null,'all'])[1];
    return {
      filter:{type:type,keyword: ''}
    };
  },
  componentDidMount: function(){
    chrome.management.getAll(function(appInfoList){
      var originalStates={};
      for(var i=0;i<appInfoList.length;i++){
        appInfoList[i].iconUrl=this.getIconUrl(appInfoList[i]);
        var action='disable';
        if(appInfoList[i].enabled){
          action='enable';
        }
        originalStates[appInfoList[i].id]=action;
      }
      this.setState({appInfoList:appInfoList,originalStates:originalStates});
    }.bind(this));
  },
  getIconUrl: function(appInfo){
    var iconUrl=undefined;
    if(appInfo.icons){
      var maxSize=0;
      for(var j=0;j<appInfo.icons.length;j++){
        var iconInfo=appInfo.icons[j];
        if(iconInfo.size>maxSize){
          maxSize=iconInfo.size;
          iconUrl=iconInfo.url;
        }
      }
    }
    if(!iconUrl){
      var canvas=document.createElement("canvas");
      canvas.width=128;
      canvas.height=128;
      var ctx=canvas.getContext('2d');
      ctx.font="120px Arial";
      ctx.fillStyle="grey";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="white";
      ctx.fillText(appInfo.name[0],22,110);
      iconUrl=canvas.toDataURL();
    }
    return iconUrl;
  },
  enableAll: function(){
    var appList=this.getFilteredList();
    for(var i=0;i<appList.length;i++){
      this.toggleState(appList[i],'enable');
    }
  },
  disableAll: function(){
    var appList=this.getFilteredList();
    for(var i=0;i<appList.length;i++){
      this.toggleState(appList[i],'disable');
    }
  },
  undoAll: function(){
    var appList=this.getFilteredList();
    for(var i=0;i<appList.length;i++){
      this.toggleState(appList[i],this.state.originalStates[appList[i].id]);
    }
  },
  getFilteredList: function(){
    return (this.state.appInfoList||[]).map(function(appInfo){
      var filter=this.state.filter;
      var pattern=new RegExp(filter.keyword,'i');
      if((filter.type=='all'||appInfo.type.indexOf(filter.type)!=-1)&&(filter.keyword==''||pattern.exec(appInfo.name))){
        return appInfo;
      }
      else{
        return null;
      }
    }.bind(this));
  },
  toggleState: function(info,newAction){
    if(!info||info.id=='mgehojanhfgnndgffijeglgahakgmgkj')
      return;
    var action='enable';
    if(info.enabled){
      action='disable';
    }
    if(newAction&&newAction!=action){
      console.log(newAction);
      console.log(action);
      return;
    }
    newCommunityRecord(true,['_trackEvent', 'manage', action, info.id]);
    chrome.management.setEnabled(info.id,!info.enabled,function(){
      var result='enabled';
      if(info.enabled){
        result='disabled';
      }
      newCommunityRecord(true,['_trackEvent', 'result', result, info.id]);
      this.setState(function(prevState){
        for(var i=0;i<prevState.appInfoList.length;i++){
          if(info.id==prevState.appInfoList[i].id){
            prevState.appInfoList[i].enabled=!info.enabled;
            break;
          }
        }
        return prevState;
      });
    }.bind(this));
  },
  uninstall: function(info){
    var result='removal_success';
    newCommunityRecord(true,['_trackEvent', 'manage', 'removal', info.id]);
    chrome.management.uninstall(info.id,function(){
      if(chrome.runtime.lastError){
        action='removal_fail';
        console.log(chrome.runtime.lastError);
        chrome.notifications.create({
          type:'basic',
          iconUrl: '/images/icon_128.png',
          title: 'Removal calcelled',
          message: 'You have cancelled the removal of '+info.name,
          imageUrl: info.icon
        });
      }
      else{
        this.setState(function(prevState){
          for(var i=0;i<prevState.appInfoList.length;i++){
            if(info.id==prevState.appInfoList[i].id){
              prevState.appInfoList.splice(i,1);
              break;
            }
          }
          return prevState;
        });
      }
      newCommunityRecord(true,['_trackEvent', 'result', result, info.id]);
    }.bind(this));
  },
  openOptions:function(url){
    chrome.tabs.create({url:url});
  },
  updateFilter: function(e){
    var id=e.target.id;
    var value=e.target.value;
    this.setState(function(prevState){
      prevState.filter[id]=value;
      return prevState;
    });
  },
  render: function(){
    var appList=this.getFilteredList().map(function(appInfo,index){
      if(appInfo){
        return (
            <AppBrief key={index} uninstall={this.uninstall.bind(this,appInfo)} toggle={this.toggleState.bind(this,appInfo,null)} optionsUrl={appInfo.optionsUrl} openOptions={this.openOptions.bind(this,appInfo.optionsUrl)} info={appInfo} />
        );
      }
    }.bind(this));
    var type=(this.props.location.pathname.match(/\/manage\/(\w*)/)||[null,'all'])[1];
    return(
      <div className="NooBoss-body">
        <Helmet
          title="Manage"
        />
        <div className="actionBar">
          <div className="type">
            Type: 
            <select defaultValue={type} onChange={this.updateFilter} id="type">
              <option value="all">All</option>
              <option value="app">App</option>
              <option value="extension">Extension</option>
              <option value="theme">Theme</option>
            </select>
          </div>
          <input id="keyword" onChange={this.updateFilter} type="text" />
          <span id="enableAll" onClick={this.enableAll}>Enable all</span>
          <span id="disableAll" onClick={this.disableAll}>Disable all</span>
          <span id="undo" onClick={this.undoAll}>Undo all</span>
        </div>
        {appList}
      </div>
    );
  }
});