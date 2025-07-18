import os
import pandas as pd

TRADE_TYPE_EXPEND = 1
TRADE_TYPE_INCOME = 2
TRADE_TYPE_TRANSFER = 3

ACCOUNT_CASH = '现金'
ACCOUNT_BANK = '银行卡'
ACCOUNT_WEALTH_MANAGEMENT = '家庭理财账户'

category_expend = {
    # 行车交通
    '石油': ('行车交通', '加油'), 
    '石化': ('行车交通', '加油'),
    '停车': ('行车交通', '停车'),
    '深圳通': ('行车交通', '地铁'),
    '滴滴出行': ('行车交通', '打车'),
    # 购物消费
    '天猫': ('购物消费', '日常购物'),
    '淘宝': ('购物消费', '日常购物'),
    '京东': ('购物消费', '日常购物'),
    '盒马': ('购物消费', '日常购物'),
    '快团团': ('购物消费', '日常购物'),
    '超市': ('购物消费', '日常购物'),
    '便利店': ('购物消费', '日常购物'),
    # 出差旅游
    '中国铁路网络有限公司': ('出差旅游', '交通费'),
    '携程旅行网': ('出差旅游', '其他消费'),
    # 食品酒水
    '美团': ('食品酒水', '日常餐饮'),
    '餐饮': ('食品酒水', '日常餐饮'),
    '美食': ('食品酒水', '日常餐饮'),
    '用膳团': ('食品酒水', '日常餐饮'),
    '三津汤包': ('食品酒水', '日常餐饮'),
    '合合乐团餐': ('食品酒水', '日常餐饮'),
    '美餐': ('食品酒水', '日常餐饮'),
    '家企乐': ('食品酒水', '日常餐饮'),
    # 居家生活
    '物业': ('居家生活', '物业费'),
    '水务集团': ('居家生活', '水费'),
    '深圳燃气': ('居家生活', '燃气费'),
    '深圳供电局': ('居家生活', '电费'),
    # 金融保险
    '基金': ('金融保险', '投资理财'),
    '房贷': ('金融保险', '房贷'),
    # 交流通信
    '广东移动': ('交流通信', '手机话费'),
}

category_income = {
    '退货': ('其他收入','退款'),
    '工资': ('职业收入', '工资收入'),
}

wealth_management_keywords = {
    '基金', '理财'    
}

def convert_ccb_to_sui(input_path, output_path):
    # 读取建设银行流水（注意跳过表头行）
    ccb_df = pd.read_excel(input_path, 
                          skiprows=3, 
                          header=None,
                          names=['序号', '摘要', '币别', '钞汇', '交易日期', '交易金额', 
                                 '账户余额', '交易地点/附言', '对方账号与户名'],
                          parse_dates=['交易日期'])
    
    # 创建随手记模板结构
    expense_list = []
    income_list = []
    transfer_list = []

    for _, row in ccb_df.iterrows():
        # 处理金额格式（去掉逗号分隔符）
        amount = float(str(row['交易金额']).replace(',', ''))
        # 处理日期格式
        trans_date = row['交易日期'].strftime('%Y-%m-%d %H:%M:%S')
        # 生成完整备注
        full_remark = f"{row['摘要']} {row['交易地点/附言']}".strip()
        # 获取摘要
        abstract = row['摘要']
        # 解析对方账户信息
        counterpart = str(row['对方账号与户名']).split('/')
        # counterpart_account = counterpart[0] if len(counterpart) > 0 else ''
        counterpart_name = counterpart[1] if len(counterpart) > 1 else ''
        is_wealth_management = is_wealth_management_operation(full_remark)
        trade_type = get_trade_type(amount, abstract, full_remark)

        # 判断交易类型
        if trade_type == TRADE_TYPE_EXPEND:  # 支出
            amount_abs = abs(amount)
            main_cat, sub_cat = get_category(full_remark, TRADE_TYPE_EXPEND)
            expense_list.append({
                '交易类型': '支出',
                '日期': trans_date,
                '分类': main_cat,
                '子分类': sub_cat,
                '支出账户': ACCOUNT_BANK,
                '金额': amount_abs,
                '商家': '其他',
                '备注': full_remark
            })
        elif trade_type == TRADE_TYPE_TRANSFER:  # 转账
            transfer_out_account = get_transfer_out_account(amount, is_wealth_management)
            transfer_in_account = get_transfer_in_account(amount, is_wealth_management)
            transfer_list.append({
                '交易类型': '转账',
                '日期': trans_date,
                '转出账户': transfer_out_account,
                '转入账户': transfer_in_account,
                '金额': abs(amount),
                '备注': full_remark
            })
        else:  # 收入
            main_cat, sub_cat = get_category(full_remark, TRADE_TYPE_INCOME)
            income_list.append({
                '交易类型': '收入',
                '日期': trans_date,
                '分类': main_cat,
                '子分类': sub_cat,
                '收入账户': ACCOUNT_BANK,
                '金额': amount,
                '备注': full_remark
            })

    # 创建DataFrame
    expense_df = pd.DataFrame(expense_list)
    income_df = pd.DataFrame(income_list)
    transfer_df = pd.DataFrame(transfer_list)

    # 写入Excel文件
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        expense_df.to_excel(writer, sheet_name='支出', index=False)
        income_df.to_excel(writer, sheet_name='收入', index=False)
        transfer_df.to_excel(writer, sheet_name='转账', index=False)

def get_trade_type(amount, abstract, full_remark):
    is_wealth_management = is_wealth_management_operation(full_remark)
    if (amount < 0) & (is_wealth_management == False):
        return TRADE_TYPE_EXPEND
    elif (is_wealth_management==True) | (abstract == '跨行转出'):
        return TRADE_TYPE_TRANSFER
    else:
        return TRADE_TYPE_INCOME

def is_wealth_management_operation(remark):
    remark = str(remark).lower()
    for keyword in wealth_management_keywords:
        if keyword.lower() in remark:
            return True
    return False

# 分类处理函数
def get_category(remark, tradeType):
    """智能分类逻辑"""
    remark = str(remark).lower()  # 转为小写方便匹配
    # 根据交易类型获取对应的map
    category_config = {}
    if tradeType == TRADE_TYPE_INCOME:
       category_config = category_income
    else :
       category_config = category_expend
    # 默认分类
    default_category = None
    if tradeType == TRADE_TYPE_EXPEND:
        default_category = ('其他杂项', '其他支出')
    elif tradeType == TRADE_TYPE_INCOME:
        default_category = ('其他收入','收入')
    
    # 优先匹配关键词
    for keyword, category in category_config.items():
        if keyword.lower() in remark:
            return category
    
    # 没有匹配的情况下返回默认分类
    return default_category
    
def get_transfer_out_account(amount, is_wealth_management):
    if amount < 0:
        return ACCOUNT_BANK
    elif is_wealth_management:
        return ACCOUNT_WEALTH_MANAGEMENT
    else:
        return ACCOUNT_CASH
    
def get_transfer_in_account(amount, is_wealth_management):
    if amount > 0:
        if is_wealth_management:
            return ACCOUNT_BANK
        else:
            return ACCOUNT_CASH
    else:
        if is_wealth_management:
            return ACCOUNT_WEALTH_MANAGEMENT
        else:
            return ACCOUNT_CASH

def get_file_path(prompt):
    """获取有效的文件路径"""
    while True:
        path = input(prompt).strip(' "\'')
        if os.path.isfile(path):
            return path
        print(f"错误：文件不存在 - {path}\n请检查路径后重新输入")

if __name__ == '__main__':
    # try: 
        input_file = get_file_path("请输入建设银行流水文件路径：")
        output_file = input("请输入输出文件名或者回车使用默认文件名（默认：随手记账单.xlsx）：").strip() or "随手记账单.xlsx"
        # 执行转换
        convert_ccb_to_sui(input_file, output_file)
        print(f"转换完成！文件已保存至：{os.path.abspath(output_file)}")

    # except Exception as e:
    #     print(f"\转换失败。失败原因：{str(e)}", e)

