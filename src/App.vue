<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
onLaunch(() => {
  console.log('App Launch');
});
onShow(() => {
  console.log('App Show');
});
onHide(() => {
  console.log('App Hide');
});
</script>
<style>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
  background: #efe5d5;
}

uni-app,
#app,
uni-page,
uni-page-wrapper,
uni-page-body {
  width: 100%;
  overflow-x: hidden;
  background: #efe5d5;
}

uni-page-body {
  min-height: auto;
  height: auto;
  box-sizing: border-box;
}
</style>
