// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    'deviceId':'',
    'ssid':'',
    'password':'',
    'serviceId':'',
    'version':'V1.0',
    'ble_name':'',
    'characteristicId':''
  },
  bindPasswordInput: function(e) {
    this.setData({
      password: e.detail.value
    })
  },
  bindSsidInput: function(e) {
    this.setData({
      ssid: e.detail.value
    })
  },
  bindbleInput: function(e) {
    wx.setStorageSync('ble_name',e.detail.value);
    this.setData({
      ble_name: e.detail.value
    })
    this.searh_newble();
  },
  onLoad() {
    this.setData({
      ssid:wx.getStorageSync('ssid'),
      password:wx.getStorageSync('password'),
      ble_name:wx.getStorageSync('ble_name'),
      ble_id:wx.getStorageSync('ble_id'),
    })
    var that=this;
    this.bleInit();
  },
  bleInit() {
         // 初始化蓝牙模块
    wx.openBluetoothAdapter({
      mode: 'central',//兼容iOS作为主机模式，改为peripheral则为外围模式
      success: (res) => {
        //判断是否曾经连接过
        if(wx.getStorageSync('ble_id')){
          console.log(wx.getStorageSync('ble_id'))
          this.bleConnection(wx.getStorageSync('ble_id'));
          wx.showLoading({
            title: '蓝牙尝试连接中',
          })
        }else if(this.data.ble_name){
        this.searh_newble();
        }


      }
    })
      console.log('init');
    var that = this
    //监听蓝牙低功耗设备的特征值变化事件，也就是读取接口获取到的信息
    wx.onBLECharacteristicValueChange((result) => {
      console.log(result.value)
      let hex = that.ab2hex(result.value)
      console.log(hex)
      console.log('设备特征值改变hextoString',that.hextoString(hex))
    })
  },
  //开始搜索新蓝牙设备
  searh_newble(){
            // 开始搜索附近的蓝牙外围设备
     wx.startBluetoothDevicesDiscovery({
              allowDuplicatesKey: true,
              powerLevel:'high'
            })
    console.log('start searchBle')
      wx.onBluetoothDeviceFound((res) => {
        // 监听扫描新设备
        res.devices.forEach((device) => {
          console.log('Device Found', device)
          if(wx.getStorageSync('ble_name')){
            wx.showLoading({
              title: '搜索蓝牙中',
            })
          }
            if(device.name == wx.getStorageSync('ble_name')){
            wx.showModal({
              title: '蓝牙已找到',
              showCancel: false, //是否显示取消按钮
            })
            wx.stopBluetoothDevicesDiscovery()   // 找到要搜索的设备后，及时停止扫描
            // 找到设备开始连接
            this.bleConnection(device.deviceId);
           }
          // 在此处可以做一些过滤，最好是可以通过console.log('Device Found', device)查出你所要连接蓝牙的deviceId也许会更安全，然后在此处进行替换绑定
          // if(device.deviceId == "EC:62:60:84:64:EE"){
          //   wx.showModal({
          //     title: '蓝牙已连接',
          //     showCancel: false, //是否显示取消按钮
          //   })
          //   // 找到设备开始连接
          //   this.bleConnection(device.deviceId);
          //   wx.stopBluetoothDevicesDiscovery() // 找到要搜索的设备后，及时停止扫描
          // }
        })
      })
  },
  //开始连接
  bleConnection(deviceId){
    wx.createBLEConnection({
      deviceId, 
      fail:(res)=>{
        this.bleConnection(deviceId)
        console.log(res)
      },
      success: () => {
      wx.hideLoading();
        this.bleGetDeviceServices(deviceId)//获取设备服务
        console.log('连接蓝牙成功')
        wx.setStorageSync('ble_id',deviceId)
        wx.showModal({
          title: '蓝牙已连接',
          showCancel: false, //是否显示取消按钮
        })
      }
    })
  },
  //获取设备服务
  bleGetDeviceServices(deviceId){
    //获取蓝牙低功耗设备所有服务
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        console.log(res.services)
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            this.bleGetDeviceCharacteristics(deviceId,res.services[i].uuid,i)
          }
        }
      }
    })
  },
  //获取设备服务特征
  bleGetDeviceCharacteristics(deviceId,serviceId,isa){
    //获取蓝牙低功耗设备某个服务中所有特征
    wx.getBLEDeviceCharacteristics({
      deviceId, 
      serviceId, 
      success: (res) => {
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          console.log(isa+':',item)
          if (item.properties.write) { // 该特征值可写,将其记录下来，我们将在后续当中向其发送数据
            this.setData({
              'deviceId':deviceId,
              'serviceId':serviceId,
              'characteristicId':item.uuid
            })
          }
          if (item.properties.read) { // 该特征值可读，读取蓝牙低功耗设备特征值的二进制数据
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              success (res) {
                console.log('readBLECharacteristicValue:', res.errCode)
              }
            })
          }
          if (item.properties.notify || item.properties.indicate) {
            //这里是为了支持监听characteristicValueChange事件
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
              success (res) {
                console.log('notifyBLECharacteristicValueChange success', res.errMsg)
              }
            })
          }
        }
      }
    })
  },
  //将字符串转换成字节
  stringToBytes(str) {
    var array = new Uint8Array(str.length);
    for (var i = 0, l = str.length; i < l; i++) {
      array[i] = str.charCodeAt(i);
    }
    console.log(array);
    return array.buffer;
  },
  //十六进制转字符串
  hextoString: function (hex) {
    var arr = hex.split("")
    var out = ""
    for (var i = 0; i < arr.length / 2; i++) {
      var tmp = "0x" + arr[i * 2] + arr[i * 2 + 1]
      var charValue = String.fromCharCode(tmp);
      out += charValue
    }
    return out
  },
  //微信提供的ArrayBuffer转16进制字符串
  ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },
  Sendtoble(){

    // 向蓝牙设备发送一个0x00的16进制数据
let buffer = new ArrayBuffer(1)
let dataView = new DataView(buffer)
dataView.setUint8(0, 0)

wx.writeBLECharacteristicValue({
      deviceId:this.data.deviceId,
      serviceId:this.data.serviceId,
      characteristicId:this.data.characteristicId,
  // 这里的 value 是ArrayBuffer类型
  value: buffer,
  success (res) {
    console.log('writeBLECharacteristicValue success', res.errMsg)
  }
})
    //   wx.setStorageSync('ssid',this.data.ssid);
    //   wx.setStorageSync('password',this.data.password);
    //   wx.writeBLECharacteristicValue({
    //   deviceId:this.data.deviceId,
    //   serviceId:this.data.serviceId,
    //   characteristicId:this.data.characteristicId,
    //   value: this.stringToBytes("#"+this.data.ssid), //这里的#和*只是为了区分数据
    // })
    // wx.writeBLECharacteristicValue({
    //   deviceId:this.data.deviceId,
    //   serviceId:this.data.serviceId,
    //   characteristicId:this.data.characteristicId,
    //   value: this.stringToBytes("*"+this.data.password),//这里的#和*只是为了区分数据，请在设备端获取到数据后自行进行处理，处理办法如for循环去掉首位数据
    //   complete:(res)=>{
    //     console.log(res)
    //   },
    // })
    wx.onBLEConnectionStateChange(function(res) {
      // 该方法回调中可以用于处理连接意外断开等异常情况
      console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
    })
    wx.showModal({
      title: '已发送',
      showCancel: false, //是否显示取消按钮
    })
  }
  
})

